import * as api from './data/api.js';
import * as store from './state/store.js';
import { getScore } from './domain/computed.js';
import { inferStatusSuggestion, inferLabelSuggestions } from './domain/inference.js';
import { renderFilters, renderInstrumentList } from './ui/sidebar.js';
import { renderDetailHeader, renderLabelsStrip, renderScoreStrip, renderDisplayReadyBadge } from './ui/detail.js';
import { renderLog } from './ui/log.js';
import * as form from './ui/form.js';
import { openStatusModal, closeStatusModal } from './ui/modal.js';

// ── Helpers ──────────────────────────────────────────────────────────

function getSearchValue() {
  return document.getElementById('searchInput').value;
}

async function refreshSidebar() {
  const instruments = await api.listInstruments(store.get('activeFilter'), getSearchValue());
  renderInstrumentList(instruments, store.get('selectedId'), selectInstrument);
}

/**
 * Compute projected state after the pending entry, for display-ready preview.
 */
async function updateDisplayReadyPreview() {
  const id = store.get('selectedId');
  if (!id) return;
  const inst = await api.getInstrument(id);
  const type = document.getElementById('entryType').value;
  if (!type) {
    form.renderDisplayReadyPreview(null, null, []);
    return;
  }

  const projectedStatus = document.getElementById('entryNewStatus').value || inst.status;
  const scoreVal = document.getElementById('entryScore').value;
  const projectedScore = scoreVal ? parseInt(scoreVal) : getScore(inst);
  const pendingLabels = store.get('pendingLabels');
  const projectedLabels = [...inst.labels];
  Object.entries(pendingLabels).forEach(([key, action]) => {
    if (action === 'add' && !projectedLabels.includes(key)) projectedLabels.push(key);
    if (action === 'remove') {
      const i = projectedLabels.indexOf(key);
      if (i > -1) projectedLabels.splice(i, 1);
    }
  });

  form.renderDisplayReadyPreview(projectedStatus, projectedScore, projectedLabels);
}

// ── Core Actions ─────────────────────────────────────────────────────

async function selectInstrument(id) {
  // Save draft for previous instrument (skip if switching to same id — e.g. after submission)
  const prevId = store.get('selectedId');
  if (prevId && prevId !== id) {
    const values = form.readFormValues();
    store.saveDraft(prevId, values);
  }

  store.set('selectedId', id);
  const inst = await api.getInstrument(id);
  if (!inst) return;

  // Render detail panels
  await refreshSidebar();
  renderDetailHeader(inst);
  renderLabelsStrip(inst);
  renderDisplayReadyBadge(inst);
  renderScoreStrip(inst);
  renderLog(inst);

  // Form: show button, close panel, restore draft or reset
  form.showFormButton();
  form.closeForm();
  form.configureStatusSelect(inst);
  form.clearStatusHint();

  const draft = store.getDraft(id);
  if (draft) {
    form.setFormValues(draft);
    store.set('pendingLabels', { ...draft.pendingLabels });
    store.set('stagedFiles', [...draft.stagedFiles]);
    form.renderAttachPreview(store.get('stagedFiles'), removeStagedFile);
    form.renderLabelsFormRow(inst, store.get('pendingLabels'), onLabelToggle);
    updateDisplayReadyPreview();
    document.getElementById('submitBtn').disabled = !draft.type;
    if (draft.formOpen) form.openForm();
  } else {
    form.resetForm(inst);
    store.set('pendingLabels', {});
    store.set('stagedFiles', []);
    form.renderAttachPreview([], removeStagedFile);
    form.renderLabelsFormRow(inst, {}, onLabelToggle);
    updateDisplayReadyPreview();
  }
}

async function addEntry() {
  const id = store.get('selectedId');
  if (!id) return;
  const inst = await api.getInstrument(id);

  const values = form.readFormValues();
  if (!values.notes.trim()) {
    form.flashNotesError();
    return;
  }

  // Compute effective changes
  const terminal = inst.status === 'retired' || inst.status === 'disposed';
  const effectiveStatus = (!terminal && values.status && values.status !== inst.status)
    ? values.status : null;
  const currentScore = getScore(inst);
  const effectiveScore = (values.score && parseInt(values.score) !== currentScore)
    ? parseInt(values.score) : null;

  // Collect label changes from pending
  const pendingLabels = store.get('pendingLabels');
  const labelsAdded = [];
  const labelsRemoved = [];
  Object.entries(pendingLabels).forEach(([key, action]) => {
    if (action === 'add' && !inst.labels.includes(key)) labelsAdded.push(key);
    if (action === 'remove') labelsRemoved.push(key);
  });

  await api.addLogEntry(id, {
    type: values.type,
    date: values.date,
    notes: values.notes.trim(),
    status: effectiveStatus,
    score: effectiveScore,
    labelsAdded,
    labelsRemoved,
    attachments: store.get('stagedFiles').map(f => ({ name: f.name, type: f.type, url: f.url })),
  });

  // Clear form state
  store.set('stagedFiles', []);
  store.set('pendingLabels', {});
  store.clearDraft(id);

  await selectInstrument(id);
}

async function applyStatus(statusKey) {
  const id = store.get('selectedId');
  if (!id) return;
  const inst = await api.getInstrument(id);
  if (statusKey === inst.status) {
    closeStatusModal();
    return;
  }

  await api.addLogEntry(id, {
    type: 'other',
    notes: `Status set to "${statusKey}".`,
    status: statusKey,
    score: null,
    labelsAdded: [],
    labelsRemoved: [],
  });

  closeStatusModal();
  await selectInstrument(id);
}

// ── Form Event Handlers ──────────────────────────────────────────────

async function reInferLabels() {
  const id = store.get('selectedId');
  if (!id) return;
  const inst = await api.getInstrument(id);
  const type = document.getElementById('entryType').value;
  const statusSelect = document.getElementById('entryNewStatus');

  document.getElementById('submitBtn').disabled = !type;

  if (!type) {
    statusSelect.value = inst.status;
    form.clearStatusHint();
    store.set('pendingLabels', {});
    form.renderLabelsFormRow(inst, {}, onLabelToggle);
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
    form.showStatusHint('← inferred', 'var(--amber)');
  }

  // Infer label suggestions based on effective status
  const effectiveStatus = statusSelect.value;
  const suggestions = inferLabelSuggestions(type, effectiveStatus, inst.labels);
  store.set('pendingLabels', suggestions);
  form.renderLabelsFormRow(inst, suggestions, onLabelToggle);
  updateDisplayReadyPreview();
}

async function onStatusChange() {
  const id = store.get('selectedId');
  if (!id) return;
  const inst = await api.getInstrument(id);
  const selected = document.getElementById('entryNewStatus').value;
  const type = document.getElementById('entryType').value;

  if (selected !== inst.status) {
    const suggestedStatus = type ? inferStatusSuggestion(type, inst.status) : null;
    if (suggestedStatus && selected === suggestedStatus) {
      form.showStatusHint('← inferred', 'var(--amber)');
    } else {
      form.showStatusHint('← manual override', 'var(--red)');
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

async function onLabelToggle(key, action) {
  const pendingLabels = { ...store.get('pendingLabels') };
  if (action === 'cancel') {
    delete pendingLabels[key];
  } else {
    pendingLabels[key] = action;
  }
  store.set('pendingLabels', pendingLabels);

  const inst = await api.getInstrument(store.get('selectedId'));
  form.renderLabelsFormRow(inst, pendingLabels, onLabelToggle);
  updateDisplayReadyPreview();
}

function onFilesSelected() {
  const input = document.getElementById('entryFiles');
  const stagedFiles = store.get('stagedFiles');
  for (const file of input.files) {
    const url = URL.createObjectURL(file);
    stagedFiles.push({ name: file.name, type: file.type, url });
  }
  store.set('stagedFiles', stagedFiles);
  input.value = '';
  form.renderAttachPreview(stagedFiles, removeStagedFile);
}

function removeStagedFile(index) {
  const stagedFiles = store.get('stagedFiles');
  URL.revokeObjectURL(stagedFiles[index].url);
  stagedFiles.splice(index, 1);
  store.set('stagedFiles', stagedFiles);
  form.renderAttachPreview(stagedFiles, removeStagedFile);
}

async function onFilterChange(filterKey) {
  store.set('activeFilter', filterKey);
  await refreshSidebar();
}

async function onOpenStatusModal() {
  const id = store.get('selectedId');
  if (!id) return;
  const inst = await api.getInstrument(id);
  openStatusModal(inst, applyStatus);
}

// ── Boot ─────────────────────────────────────────────────────────────

// Wire up event listeners
document.getElementById('searchInput').addEventListener('input', refreshSidebar);
document.getElementById('addLogBtn').addEventListener('click', () => form.toggleForm());
document.getElementById('statusBadge').addEventListener('click', onOpenStatusModal);
document.getElementById('statusModal').addEventListener('click', (e) => closeStatusModal(e));
document.querySelector('#statusModal .modal-close').addEventListener('click', () => closeStatusModal());
document.getElementById('entryType').addEventListener('change', reInferLabels);
document.getElementById('entryNewStatus').addEventListener('change', onStatusChange);
document.getElementById('entryScore').addEventListener('change', updateDisplayReadyPreview);
document.getElementById('entryFiles').addEventListener('change', onFilesSelected);
document.getElementById('submitBtn').addEventListener('click', addEntry);
document.querySelector('.attach-btn').addEventListener('click', () => document.getElementById('entryFiles').click());

// Initial render
renderFilters(onFilterChange);
refreshSidebar();
document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
