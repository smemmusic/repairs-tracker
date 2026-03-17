import * as api from '../data/api.js';
import * as store from '../state/store.js';
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

function getCurrentInstrument() {
  return store.get('currentInstrument');
}

// ── Display-Ready Preview ─────────────────────────────────────────────

export function updateDisplayReadyPreview() {
  const inst = getCurrentInstrument();
  if (!inst) return;
  const type = document.getElementById('entryType').value;
  if (!type) {
    form.renderDisplayReadyPreview(null, null, []);
    return;
  }

  const projectedStatus = document.getElementById('entryNewStatus').value || inst.status;
  const scoreVal = document.getElementById('entryScore').value;
  const projectedScore = scoreVal ? parseInt(scoreVal) : inst.score;
  const pendingLabels = store.get('pendingLabels');
  const projectedLabels = [...inst.labels];
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
  const inst = getCurrentInstrument();
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
    // Create mode — upload files first, then create entry
    const { added: labelsAdded, removed: labelsRemoved } = partitionLabelActions(store.get('pendingLabels'));

    const attachmentIds = [];
    for (const staged of store.get('stagedFiles')) {
      try {
        const uploaded = await api.uploadAttachment(staged.file);
        attachmentIds.push(uploaded.id);
      } catch (e) {
        alert(`Upload failed: ${e.message}`);
        return;
      }
    }

    try {
      await api.addLogEntry(id, {
        type: values.type,
        date: values.date,
        notes: values.notes.trim(),
        status: values.status || null,
        score: values.score ? parseInt(values.score) : null,
        location: values.location || null,
        labelsAdded,
        labelsRemoved,
        attachmentIds,
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
  const inst = getCurrentInstrument();
  const entry = inst.log.find(e => e.id === logEntryId);
  if (!entry) return;

  // Pre-fill the form with the entry's values
  store.set('editingEntryId', logEntryId);
  form.setFormValues({
    type: entry.type,
    status: entry.status || inst.status,
    score: entry.score ? String(entry.score) : '',
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

export function reInferLabels({ labelToggle } = {}) {
  const toggleCb = labelToggle !== undefined ? labelToggle : onLabelToggle;
  const inst = getCurrentInstrument();
  if (!inst) return;
  const type = document.getElementById('entryType').value;
  const statusSelect = document.getElementById('entryNewStatus');

  document.getElementById('submitBtn').disabled = !type;
  statusSelect.disabled = !type;

  if (!type) {
    statusSelect.value = inst.status;
    form.clearStatusHint();
    store.set('pendingLabels', {});
    form.renderLabelsFormRow(inst, {}, toggleCb);
    updateDisplayReadyPreview();
    return;
  }

  // Reset status to instrument's current before inferring
  statusSelect.value = inst.status;
  form.clearStatusHint();

  // Infer status suggestion
  const suggestedStatus = inferStatusSuggestion(type, inst.status);
  if (suggestedStatus) {
    statusSelect.value = suggestedStatus;
    form.showStatusHint('\u2190 inferred', 'inferred');
  }

  // Infer label suggestions based on effective status
  const effectiveStatus = statusSelect.value;
  const suggestions = inferLabelSuggestions(type, effectiveStatus, inst.labels);
  store.set('pendingLabels', suggestions);
  form.renderLabelsFormRow(inst, suggestions, toggleCb);
  updateDisplayReadyPreview();
}

export function onStatusChange() {
  const inst = getCurrentInstrument();
  if (!inst) return;
  const selected = document.getElementById('entryNewStatus').value;
  const type = document.getElementById('entryType').value;

  if (selected !== inst.status) {
    const suggestedStatus = type ? inferStatusSuggestion(type, inst.status) : null;
    if (suggestedStatus && selected === suggestedStatus) {
      form.showStatusHint('\u2190 inferred', 'inferred');
    } else {
      form.showStatusHint('\u2190 manual override', 'override');
    }
  } else {
    form.clearStatusHint();
  }

  // Re-infer labels based on new effective status
  const effectiveStatus = selected || inst.status;
  const suggestions = type ? inferLabelSuggestions(type, effectiveStatus, inst.labels) : {};
  store.set('pendingLabels', suggestions);
  form.renderLabelsFormRow(inst, suggestions, onLabelToggle);
  updateDisplayReadyPreview();
}

export function onLabelToggle(key, action) {
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
    const inst = getCurrentInstrument();
    form.renderLabelsFormRow(inst, pendingLabels, onLabelToggle);
    updateDisplayReadyPreview();
  }
}

export function onFilesSelected() {
  const input = document.getElementById('entryFiles');
  const stagedFiles = store.get('stagedFiles');
  for (const file of input.files) {
    stagedFiles.push({
      file,  // raw File object — uploaded on submit
      file_name: file.name,
      mime_type: file.type,
      url: URL.createObjectURL(file),  // local preview
    });
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
