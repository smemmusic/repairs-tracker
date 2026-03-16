import * as api from '../data/api.js';
import * as store from '../state/store.js';
import { getScore } from '../domain/computed.js';
import { createAttachment } from '../domain/models.js';
import { inferStatusSuggestion, inferLabelSuggestions } from '../domain/inference.js';
import { LabelAction, partitionLabelActions } from '../domain/constants.js';
import * as form from './form.js';
import { confirmModal } from './shared.js';

// ── Callbacks (set via init) ──────────────────────────────────────────

let _selectInstrument, _showToast;

export function init({ selectInstrument, showToast }) {
  _selectInstrument = selectInstrument;
  _showToast = showToast;
}

// ── Helpers ───────────────────────────────────────────────────────────

function caps() {
  return store.get('session')?.capabilities || {};
}

// ── Display-Ready Preview ─────────────────────────────────────────────

export async function updateDisplayReadyPreview() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const type = document.getElementById('entryType').value;
  if (!type) {
    form.renderDisplayReadyPreview(null, null, []);
    return;
  }

  const projectedStatus = document.getElementById('entryNewStatus').value || raw.status;
  const scoreVal = document.getElementById('entryScore').value;
  const projectedScore = scoreVal ? parseInt(scoreVal) : getScore(raw);
  const pendingLabels = store.get('pendingLabels');
  const projectedLabels = [...raw.labels];
  Object.entries(pendingLabels).forEach(([key, action]) => {
    if (action === LabelAction.ADD && !projectedLabels.includes(key)) projectedLabels.push(key);
    if (action === LabelAction.REMOVE) {
      const i = projectedLabels.indexOf(key);
      if (i > -1) projectedLabels.splice(i, 1);
    }
  });

  form.renderDisplayReadyPreview(projectedStatus, projectedScore, projectedLabels);
}

// ── Submission ────────────────────────────────────────────────────────

export async function submitEntry() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const editingId = store.get('editingEntryId');

  const values = form.readFormValues();
  if (!values.notes.trim()) {
    form.flashNotesError();
    return;
  }

  if (editingId) {
    // Edit mode — update existing entry
    const { added: labelsAdded, removed: labelsRemoved } = partitionLabelActions(store.get('pendingLabels'));

    try {
      await api.editLogEntry(id, editingId, {
        notes: values.notes.trim(),
        status: values.status || null,
        score: values.score ? parseInt(values.score) : null,
        location: values.location || null,
        labels_added: labelsAdded,
        labels_removed: labelsRemoved,
      });
    } catch (e) {
      alert(e.message);
      return;
    }
    store.set('editingEntryId', null);
    _showToast('Log entry updated');
  } else {
    // Create mode — add new entry
    const effectiveStatus = (values.status && values.status !== raw.status)
      ? values.status : null;
    const currentScore = getScore(raw);
    const effectiveScore = (values.score && parseInt(values.score) !== currentScore)
      ? parseInt(values.score) : null;

    const { added: labelsAdded, removed: labelsRemoved } = partitionLabelActions(store.get('pendingLabels'));

    try {
      await api.addLogEntry(id, {
        type: values.type,
        date: values.date,
        notes: values.notes.trim(),
        status: effectiveStatus,
        score: effectiveScore,
        location: values.location || null,
        labelsAdded,
        labelsRemoved,
        attachments: store.get('stagedFiles').map(f => createAttachment(f)),
      });
    } catch (e) {
      alert(e.message);
      return;
    }
    _showToast('Log entry saved');
  }

  // Clear form state and reset DOM so stale values don't get re-saved as a draft
  store.get('stagedFiles').forEach(f => URL.revokeObjectURL(f.url));
  store.set('stagedFiles', []);
  store.set('pendingLabels', {});
  store.set('editingEntryId', null);
  store.clearDraft(id);
  document.getElementById('entryType').value = '';
  document.getElementById('entryNotes').value = '';

  await _selectInstrument(id);
}

// ── Edit / Delete ─────────────────────────────────────────────────────

export async function onEditLogEntry(logEntryId) {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const entry = raw.log.find(e => e.id === logEntryId);
  if (!entry) return;

  // Pre-fill the form with the entry's values
  store.set('editingEntryId', logEntryId);
  form.setFormValues({
    type: entry.type,
    status: entry.status || raw.status,
    score: entry.score ? String(entry.score) : String(getScore(raw) || 5),
    date: entry.date,
    location: entry.location || '',
    notes: entry.notes,
  });
  document.getElementById('submitBtn').disabled = false;

  // Pre-fill pending labels from the entry's deltas
  const pending = {};
  for (const key of (entry.labels_added || [])) pending[key] = LabelAction.ADD;
  for (const key of (entry.labels_removed || [])) pending[key] = LabelAction.REMOVE;
  store.set('pendingLabels', pending);
  form.renderLabelsEditRow(pending, onLabelToggle);

  form.setEditMode(true);
  form.openForm();
}

export async function onDeleteLogEntry(logEntryId) {
  const id = store.get('selectedId');
  if (!id) return;
  if (!await confirmModal('Delete this log entry? This cannot be undone.')) return;
  try {
    await api.deleteLogEntry(id, logEntryId);
  } catch (e) {
    alert(e.message);
    return;
  }
  _showToast('Log entry deleted');
  await _selectInstrument(id);
}

// ── Form Event Handlers ──────────────────────────────────────────────

export async function reInferLabels() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const type = document.getElementById('entryType').value;
  const statusSelect = document.getElementById('entryNewStatus');

  document.getElementById('submitBtn').disabled = !type;
  statusSelect.disabled = !type;

  if (!type) {
    statusSelect.value = raw.status;
    form.clearStatusHint();
    store.set('pendingLabels', {});
    form.renderLabelsFormRow(raw, {}, onLabelToggle);
    updateDisplayReadyPreview();
    return;
  }

  // Reset status to instrument's current before inferring
  statusSelect.value = raw.status;
  form.clearStatusHint();

  // Infer status suggestion
  const suggestedStatus = inferStatusSuggestion(type, raw.status);
  if (suggestedStatus) {
    statusSelect.value = suggestedStatus;
    form.showStatusHint('\u2190 inferred', 'inferred');
  }

  // Infer label suggestions based on effective status
  const effectiveStatus = statusSelect.value;
  const suggestions = inferLabelSuggestions(type, effectiveStatus, raw.labels);
  store.set('pendingLabels', suggestions);
  form.renderLabelsFormRow(raw, suggestions, onLabelToggle);
  updateDisplayReadyPreview();
}

export async function onStatusChange() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const selected = document.getElementById('entryNewStatus').value;
  const type = document.getElementById('entryType').value;

  if (selected !== raw.status) {
    const suggestedStatus = type ? inferStatusSuggestion(type, raw.status) : null;
    if (suggestedStatus && selected === suggestedStatus) {
      form.showStatusHint('\u2190 inferred', 'inferred');
    } else {
      form.showStatusHint('\u2190 manual override', 'override');
    }
  } else {
    form.clearStatusHint();
  }

  // Re-infer labels based on new effective status
  const effectiveStatus = selected || raw.status;
  const suggestions = type ? inferLabelSuggestions(type, effectiveStatus, raw.labels) : {};
  store.set('pendingLabels', suggestions);
  form.renderLabelsFormRow(raw, suggestions, onLabelToggle);
  updateDisplayReadyPreview();
}

export async function onLabelToggle(key, action) {
  const pendingLabels = { ...store.get('pendingLabels') };
  if (action === LabelAction.CANCEL) {
    delete pendingLabels[key];
  } else {
    pendingLabels[key] = action;
  }
  store.set('pendingLabels', pendingLabels);

  if (store.get('editingEntryId')) {
    form.renderLabelsEditRow(pendingLabels, onLabelToggle);
  } else {
    const raw = await api.getInstrumentRaw(store.get('selectedId'));
    form.renderLabelsFormRow(raw, pendingLabels, onLabelToggle);
    updateDisplayReadyPreview();
  }
}

export function onFilesSelected() {
  const input = document.getElementById('entryFiles');
  const stagedFiles = store.get('stagedFiles');
  for (const file of input.files) {
    const url = URL.createObjectURL(file);
    stagedFiles.push(createAttachment({ name: file.name, type: file.type, url }));
  }
  store.set('stagedFiles', stagedFiles);
  input.value = '';
  form.renderAttachPreview(stagedFiles, removeStagedFile);
}

export function removeStagedFile(index) {
  const stagedFiles = store.get('stagedFiles');
  URL.revokeObjectURL(stagedFiles[index].url);
  stagedFiles.splice(index, 1);
  store.set('stagedFiles', stagedFiles);
  form.renderAttachPreview(stagedFiles, removeStagedFile);
}
