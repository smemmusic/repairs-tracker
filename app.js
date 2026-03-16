import * as api from './data/api.js';
import * as store from './state/store.js';
import { renderFilters, renderInstrumentList, renderUserInfo } from './ui/sidebar.js';
import { renderDetailHeader, renderLocationStrip, renderLabelsStrip, renderScoreStrip, renderDisplayReadyBadge } from './ui/detail.js';
import { renderLog } from './ui/log.js';
import * as form from './ui/form.js';
import * as formController from './ui/form-controller.js';
import { showLoginScreen } from './ui/login.js';
import { getSession, logout } from './data/auth.js';
import { EntryType, Filter } from './domain/constants.js';

// ── Helpers ──────────────────────────────────────────────────────────

function caps() {
  return store.get('session')?.capabilities || {};
}

function getSearchValue() {
  return document.getElementById('searchInput').value;
}

function showToast(message) {
  const overlay = document.createElement('div');
  overlay.className = 'toast-overlay';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(overlay);
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    toast.classList.add('visible');
  });
  setTimeout(() => {
    toast.classList.remove('visible');
    overlay.classList.remove('visible');
    setTimeout(() => { toast.remove(); overlay.remove(); }, 300);
  }, 3000);
}

async function refreshSidebar() {
  const instruments = await api.listInstruments(store.get('activeFilter'), getSearchValue());
  renderInstrumentList(instruments, store.get('selectedId'), selectInstrument);
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
  document.getElementById('app').classList.add('instrument-selected');
  document.getElementById('backBtn').classList.remove('hidden');

  const c = caps();

  // Render detail panels
  await refreshSidebar();
  renderDetailHeader(inst);
  renderLocationStrip(raw);
  renderLabelsStrip(inst);
  renderDisplayReadyBadge(raw);
  renderScoreStrip(inst, c, raw);
  renderLog(inst, c, c.editLogEntry ? formController.onEditLogEntry : null, c.deleteLogEntry ? formController.onDeleteLogEntry : null);

  // Form setup — clear any edit mode
  store.set('editingEntryId', null);
  form.setEditMode(false);
  form.clearStatusHint();
  document.getElementById('entryType').disabled = false;

  const isGuest = !c.submitOtherEntryTypes;

  if (isGuest) {
    // Guests go straight to a locked fault_report form — no toggle needed
    document.getElementById('addLogBar').classList.add('hidden');
    form.openForm();
    form.resetForm(raw);
    store.set('pendingLabels', {});
    store.set('stagedFiles', []);
    form.renderAttachPreview([], formController.removeStagedFile);

    // Pre-fill and trigger inference
    document.getElementById('entryType').value = EntryType.FAULT_REPORT;
    document.getElementById('submitBtn').disabled = false;
    await formController.reInferLabels();

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
      form.renderAttachPreview(store.get('stagedFiles'), formController.removeStagedFile);
      form.renderLabelsFormRow(raw, store.get('pendingLabels'), formController.onLabelToggle);
      formController.updateDisplayReadyPreview();
      document.getElementById('submitBtn').disabled = !draft.type;
      if (draft.formOpen) form.openForm();
    } else {
      form.resetForm(raw);
      store.set('pendingLabels', {});
      store.set('stagedFiles', []);
      form.renderAttachPreview([], formController.removeStagedFile);
      form.renderLabelsFormRow(raw, {}, formController.onLabelToggle);
      formController.updateDisplayReadyPreview();
    }
    form.applyCapabilities(c);
  }
}

function goBackToList() {
  document.getElementById('app').classList.remove('instrument-selected');
  document.getElementById('backBtn').classList.add('hidden');
  document.getElementById('mainEmptyState').classList.remove('hidden');
  document.getElementById('mainContent').classList.remove('visible');
  store.set('selectedId', null);
  refreshSidebar();
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

  // Populate form selects from constants
  form.initFormSelects();

  // Render user info in sidebar
  renderUserInfo(session);

  // Apply form capabilities
  form.applyCapabilities(session.capabilities);

  // Provide callbacks to form controller
  formController.init({ selectInstrument, showToast });

  // Wire up event listeners (only once)
  if (!startApp._wired) {
    startApp._wired = true;
    document.getElementById('searchInput').addEventListener('input', refreshSidebar);
    document.getElementById('addLogBtn').addEventListener('click', () => {
      if (store.get('editingEntryId')) {
        store.set('editingEntryId', null);
      }
      form.toggleForm();
    });
    document.getElementById('entryType').addEventListener('change', formController.reInferLabels);
    document.getElementById('entryNewStatus').addEventListener('change', formController.onStatusChange);
    document.getElementById('entryScore').addEventListener('change', formController.updateDisplayReadyPreview);
    document.getElementById('entryFiles').addEventListener('change', formController.onFilesSelected);
    document.getElementById('submitBtn').addEventListener('click', formController.submitEntry);
    document.querySelector('.attach-btn').addEventListener('click', () => document.getElementById('entryFiles').click());
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('backBtn').addEventListener('click', goBackToList);
  }

  // Initial render
  renderFilters(onFilterChange);
  refreshSidebar();
  document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
}

function resetAppState() {
  store.set('session', null);
  store.set('selectedId', null);
  store.set('activeFilter', Filter.ALL);
  store.set('pendingLabels', {});
  store.get('stagedFiles').forEach(f => URL.revokeObjectURL(f.url));
  store.set('stagedFiles', []);
  store.set('editingEntryId', null);

  // Show empty state, hide main content
  document.getElementById('mainEmptyState').classList.remove('hidden');
  document.getElementById('mainContent').classList.remove('visible');
  document.getElementById('addLogBar').classList.add('hidden');
  document.getElementById('app').classList.remove('instrument-selected');
  document.getElementById('backBtn').classList.add('hidden');

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
