import * as api from './data/api.js';
import * as store from './state/store.js';
import { getScore } from './domain/computed.js';
import { inferStatusSuggestion, inferLabelSuggestions } from './domain/inference.js';
import { renderFilters, renderInstrumentList, renderUserInfo } from './ui/sidebar.js';
import { renderDetailHeader, renderLabelsStrip, renderScoreStrip, renderDisplayReadyBadge } from './ui/detail.js';
import { renderLog } from './ui/log.js';
import * as form from './ui/form.js';
import { showLoginScreen } from './ui/login.js';
import { getSession, logout } from './data/auth.js';

// ── Helpers ──────────────────────────────────────────────────────────

function caps() {
  return store.get('session')?.capabilities || {};
}

function getSearchValue() {
  return document.getElementById('searchInput').value;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
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
  const raw = await api.getInstrumentRaw(id);
  if (!inst) return;

  // Show main content, hide empty state
  document.getElementById('mainEmptyState').classList.add('hidden');
  document.getElementById('mainContent').classList.add('visible');

  const c = caps();

  // Render detail panels
  await refreshSidebar();
  renderDetailHeader(inst);
  renderLabelsStrip(inst);
  renderDisplayReadyBadge(raw);
  renderScoreStrip(inst, c, raw);
  renderLog(inst, c, c.deleteLogEntry ? onDeleteLogEntry : null);

  // Form setup
  form.configureStatusSelect(raw);
  form.clearStatusHint();

  const isGuest = !c.submitOtherEntryTypes;

  if (isGuest) {
    // Guests go straight to a locked fault_report form — no toggle needed
    document.getElementById('addLogBtn').classList.add('hidden');
    form.openForm();
    form.resetForm(raw);
    store.set('pendingLabels', {});
    store.set('stagedFiles', []);
    form.renderAttachPreview([], removeStagedFile);

    // Pre-fill and trigger inference
    document.getElementById('entryType').value = 'fault_report';
    document.getElementById('submitBtn').disabled = false;
    await reInferLabels();

    // Labels are read-only for guests — re-render without toggle callback
    form.renderLabelsFormRow(raw, store.get('pendingLabels'), null);

    // Apply capabilities last — locks type, status, date after everything is set
    form.applyCapabilities(c);
  } else {
    // Authenticated: normal flow with toggle and draft restore
    form.showFormButton();
    form.closeForm();

    const draft = store.getDraft(id);
    if (draft) {
      form.setFormValues(draft);
      store.set('pendingLabels', { ...draft.pendingLabels });
      store.set('stagedFiles', [...draft.stagedFiles]);
      form.renderAttachPreview(store.get('stagedFiles'), removeStagedFile);
      form.renderLabelsFormRow(raw, store.get('pendingLabels'), onLabelToggle);
      updateDisplayReadyPreview();
      document.getElementById('submitBtn').disabled = !draft.type;
      if (draft.formOpen) form.openForm();
    } else {
      form.resetForm(raw);
      store.set('pendingLabels', {});
      store.set('stagedFiles', []);
      form.renderAttachPreview([], removeStagedFile);
      form.renderLabelsFormRow(raw, {}, onLabelToggle);
      updateDisplayReadyPreview();
    }
    form.applyCapabilities(c);
  }
}

async function addEntry() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);

  const values = form.readFormValues();
  if (!values.notes.trim()) {
    form.flashNotesError();
    return;
  }

  // Compute effective changes — send everything, backend enforces permissions
  const terminal = raw.status === 'retired' || raw.status === 'disposed';
  const effectiveStatus = (!terminal && values.status && values.status !== raw.status)
    ? values.status : null;
  const currentScore = getScore(raw);
  const effectiveScore = (values.score && parseInt(values.score) !== currentScore)
    ? parseInt(values.score) : null;

  // Collect label changes from pending
  const pendingLabels = store.get('pendingLabels');
  const labelsAdded = [];
  const labelsRemoved = [];
  {
    Object.entries(pendingLabels).forEach(([key, action]) => {
      if (action === 'add' && !raw.labels.includes(key)) labelsAdded.push(key);
      if (action === 'remove') labelsRemoved.push(key);
    });
  }

  try {
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
  } catch (e) {
    alert(e.message);
    return;
  }

  // Clear form state and reset DOM so stale values don't get re-saved as a draft
  store.set('stagedFiles', []);
  store.set('pendingLabels', {});
  store.clearDraft(id);
  document.getElementById('entryType').value = '';
  document.getElementById('entryNotes').value = '';

  await selectInstrument(id);
  showToast('Log entry saved');
}

async function onDeleteLogEntry(logEntryId) {
  const id = store.get('selectedId');
  if (!id) return;
  try {
    await api.deleteLogEntry(id, logEntryId);
  } catch (e) {
    alert(e.message);
    return;
  }
  await selectInstrument(id);
}

// ── Form Event Handlers ──────────────────────────────────────────────

async function reInferLabels() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const type = document.getElementById('entryType').value;
  const statusSelect = document.getElementById('entryNewStatus');

  document.getElementById('submitBtn').disabled = !type;

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
    form.showStatusHint('← inferred', 'inferred');
  }

  // Infer label suggestions based on effective status
  const effectiveStatus = statusSelect.value;
  const suggestions = inferLabelSuggestions(type, effectiveStatus, raw.labels);
  store.set('pendingLabels', suggestions);
  form.renderLabelsFormRow(raw, suggestions, onLabelToggle);
  updateDisplayReadyPreview();
}

async function onStatusChange() {
  const id = store.get('selectedId');
  if (!id) return;
  const raw = await api.getInstrumentRaw(id);
  const selected = document.getElementById('entryNewStatus').value;
  const type = document.getElementById('entryType').value;

  if (selected !== raw.status) {
    const suggestedStatus = type ? inferStatusSuggestion(type, raw.status) : null;
    if (suggestedStatus && selected === suggestedStatus) {
      form.showStatusHint('← inferred', 'inferred');
    } else {
      form.showStatusHint('← manual override', 'override');
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

async function onLabelToggle(key, action) {
  const pendingLabels = { ...store.get('pendingLabels') };
  if (action === 'cancel') {
    delete pendingLabels[key];
  } else {
    pendingLabels[key] = action;
  }
  store.set('pendingLabels', pendingLabels);

  const raw = await api.getInstrumentRaw(store.get('selectedId'));
  form.renderLabelsFormRow(raw, pendingLabels, onLabelToggle);
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

// ── Boot ─────────────────────────────────────────────────────────────

async function startApp(session) {
  store.set('session', session);

  // Show the app
  document.getElementById('app').classList.remove('hidden');

  // Render user info in sidebar
  renderUserInfo(session);

  // Apply form capabilities
  form.applyCapabilities(session.capabilities);

  // Wire up event listeners (only once)
  if (!startApp._wired) {
    startApp._wired = true;
    document.getElementById('searchInput').addEventListener('input', refreshSidebar);
    document.getElementById('addLogBtn').addEventListener('click', () => form.toggleForm());
    document.getElementById('entryType').addEventListener('change', reInferLabels);
    document.getElementById('entryNewStatus').addEventListener('change', onStatusChange);
    document.getElementById('entryScore').addEventListener('change', updateDisplayReadyPreview);
    document.getElementById('entryFiles').addEventListener('change', onFilesSelected);
    document.getElementById('submitBtn').addEventListener('click', addEntry);
    document.querySelector('.attach-btn').addEventListener('click', () => document.getElementById('entryFiles').click());
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  }

  // Initial render
  renderFilters(onFilterChange);
  refreshSidebar();
  document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
}

function resetAppState() {
  store.set('session', null);
  store.set('selectedId', null);
  store.set('activeFilter', 'all');
  store.set('pendingLabels', {});
  store.set('stagedFiles', []);

  // Show empty state, hide main content
  document.getElementById('mainEmptyState').classList.remove('hidden');
  document.getElementById('mainContent').classList.remove('visible');
  document.getElementById('addLogBtn').classList.add('hidden');

  // Reset form to clean state
  form.closeForm();
  document.getElementById('entryType').value = '';
  document.getElementById('entryType').disabled = false;
  document.getElementById('entryNewStatus').disabled = false;
  document.getElementById('entryDate').disabled = false;
  document.getElementById('entryNotes').value = '';
  document.getElementById('attachPreview').innerHTML = '';
}

function handleLogout() {
  logout();
  resetAppState();
  document.getElementById('app').classList.add('hidden');
  showLoginScreen(startApp);
}

// Check for existing session on page load
async function boot() {
  const existing = await getSession();
  if (existing) {
    startApp(existing);
  } else {
    showLoginScreen(startApp);
  }
}

boot();
