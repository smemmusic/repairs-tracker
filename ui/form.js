import { DISPLAY_READY_THRESHOLD } from '../domain/constants.js';
import { getLabelDef, LABELS } from '../domain/constants.js';
import { getScore } from '../domain/computed.js';

/**
 * Open the entry form panel and update button text.
 */
export function openForm() {
  document.getElementById('addEntryPanel').classList.add('open');
  document.getElementById('addLogBtn').textContent = '← View log';
}

/**
 * Close the entry form panel and update button text.
 */
export function closeForm() {
  document.getElementById('addEntryPanel').classList.remove('open');
  document.getElementById('addLogBtn').textContent = '+ New entry';
}

/**
 * Toggle the form open/closed.
 */
export function toggleForm() {
  const panel = document.getElementById('addEntryPanel');
  if (panel.classList.contains('open')) {
    closeForm();
  } else {
    openForm();
  }
}

/**
 * Show the add-log button (hidden until an instrument is selected).
 */
export function showFormButton() {
  document.getElementById('addLogBtn').classList.remove('hidden');
}

/**
 * Read all current form field values as a plain object.
 */
export function readFormValues() {
  return {
    type: document.getElementById('entryType').value,
    status: document.getElementById('entryNewStatus').value,
    score: document.getElementById('entryScore').value,
    date: document.getElementById('entryDate').value,
    notes: document.getElementById('entryNotes').value,
    formOpen: document.getElementById('addEntryPanel').classList.contains('open'),
  };
}

/**
 * Apply capability restrictions to the form controls.
 * Hides/disables controls the user can't use.
 * @param {Object} capabilities - current session capabilities
 */
export function applyCapabilities(capabilities) {
  const typeSelect = document.getElementById('entryType');
  const scoreGroup = document.getElementById('scoreGroup');
  const displayReadyGroup = document.getElementById('displayReadyGroup');

  const isGuest = !capabilities.submitOtherEntryTypes;

  // Entry type: locked to fault_report for guests
  typeSelect.disabled = isGuest;
  if (isGuest) {
    Array.from(typeSelect.options).forEach(opt => {
      if (opt.value && opt.value !== 'fault_report') {
        opt.disabled = true;
        opt.classList.add('hidden');
      }
    });
  } else {
    Array.from(typeSelect.options).forEach(opt => {
      opt.disabled = false;
      opt.classList.remove('hidden');
    });
  }

  // Status: visible but read-only for guests (shows inferred value)
  const statusSelect = document.getElementById('entryNewStatus');
  if (isGuest) statusSelect.disabled = true;

  // Date: read-only for guests
  const dateInput = document.getElementById('entryDate');
  if (dateInput) dateInput.disabled = isGuest;

  // Score: hidden for guests
  if (scoreGroup) scoreGroup.classList.toggle('hidden', !capabilities.viewScores);

  // Display-ready, contributor: hidden for guests
  if (displayReadyGroup) displayReadyGroup.classList.toggle('hidden', !capabilities.viewScores);
}

/**
 * Populate form fields from a values object (used for draft restore and reset).
 */
export function setFormValues(values) {
  document.getElementById('entryType').value = values.type || '';
  document.getElementById('entryNewStatus').value = values.status || 'unknown';
  document.getElementById('entryScore').value = values.score || '5';
  document.getElementById('entryDate').value = values.date || new Date().toISOString().split('T')[0];
  document.getElementById('entryNotes').value = values.notes || '';
  document.getElementById('submitBtn').disabled = !values.type;
}

/**
 * Reset the form to defaults for a given instrument.
 */
export function resetForm(instrument) {
  setFormValues({
    type: '',
    status: instrument.status,
    score: String(getScore(instrument) || 5),
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  clearStatusHint();

  const terminal = instrument.status === 'retired' || instrument.status === 'disposed';
  const statusSelect = document.getElementById('entryNewStatus');
  statusSelect.disabled = terminal;
  statusSelect.classList.toggle('terminal', terminal);
}

/**
 * Configure the status select for terminal states.
 */
export function configureStatusSelect(instrument) {
  const terminal = instrument.status === 'retired' || instrument.status === 'disposed';
  const statusSelect = document.getElementById('entryNewStatus');
  statusSelect.disabled = terminal;
  statusSelect.classList.toggle('terminal', terminal);
}

/**
 * Show status hint text (inferred or manual override).
 */
export function showStatusHint(text, type) {
  const hint = document.getElementById('statusHint');
  hint.textContent = text;
  hint.className = `status-hint visible ${type}`;
}

/**
 * Clear status hint.
 */
export function clearStatusHint() {
  const hint = document.getElementById('statusHint');
  hint.textContent = '';
  hint.className = 'status-hint';
}

/**
 * Flash the notes field border red to indicate validation error.
 */
export function flashNotesError() {
  const el = document.getElementById('entryNotes');
  el.classList.add('form-error');
  setTimeout(() => el.classList.remove('form-error'), 1000);
}

/**
 * Render label toggle buttons in the form.
 * @param {Object} instrument - current instrument
 * @param {Object} pendingLabels - map of key → 'add'|'remove'
 * @param {Function|null} onToggle - callback(key, action), or null for read-only display
 */
export function renderLabelsFormRow(instrument, pendingLabels, onToggle) {
  const row = document.getElementById('labelsFormRow');
  row.innerHTML = '';
  const readOnly = !onToggle;

  LABELS.forEach(({ key, label, cls }) => {
    const onInstrument = instrument.labels.includes(key);
    const pending = pendingLabels[key];

    // In read-only mode, only show labels that are active or pending
    if (readOnly && !onInstrument && !pending) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `label-toggle ${cls}`;
    if (readOnly) btn.classList.add('readonly');

    if (onInstrument && pending !== 'remove') {
      btn.classList.add('active');
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Click to remove this label';
        btn.onclick = () => onToggle(key, 'remove');
      }
    } else if (pending === 'remove') {
      btn.classList.add('active', 'remove');
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Click to keep this label';
        btn.onclick = () => onToggle(key, 'cancel');
      }
    } else if (pending === 'add') {
      btn.classList.add('active', 'add');
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Suggested — click to cancel';
        btn.onclick = () => onToggle(key, 'cancel');
      }
    } else {
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Click to add this label';
        btn.onclick = () => onToggle(key, 'add');
      }
    }

    row.appendChild(btn);
  });
}

/**
 * Render the display-ready preview in the form.
 * @param {string} projectedStatus - status after this entry
 * @param {number|null} projectedScore - score after this entry
 * @param {Array} projectedLabels - labels after this entry
 */
export function renderDisplayReadyPreview(projectedStatus, projectedScore, projectedLabels) {
  const container = document.getElementById('displayReadyPreview');
  if (!container) return;

  const type = document.getElementById('entryType').value;
  if (!type) {
    container.innerHTML = '';
    return;
  }

  const checks = [
    { label: 'Status: working', pass: projectedStatus === 'working' },
    { label: 'No active labels', pass: projectedLabels.length === 0 },
    { label: `Score ≥ ${DISPLAY_READY_THRESHOLD}`, pass: projectedScore !== null && projectedScore >= DISPLAY_READY_THRESHOLD },
  ];
  const allPass = checks.every(c => c.pass);

  container.innerHTML = `
    <span class="dr-preview-wrap">
      <span class="display-ready-badge ${allPass ? 'pass' : 'fail'}">${allPass ? '✓' : '✗'} Display ready</span>
      <span class="dr-tooltip">${checks.map(c =>
        `<span class="${c.pass ? 'dr-check-pass' : 'dr-check-fail'}">${c.pass ? '✓' : '✗'} ${c.label}</span>`
      ).join('')}</span>
    </span>
  `;
}

/**
 * Render attachment preview thumbnails in the form.
 * @param {Array} stagedFiles - array of { name, type, url }
 * @param {Function} onRemove - callback(index)
 */
export function renderAttachPreview(stagedFiles, onRemove) {
  const container = document.getElementById('attachPreview');
  container.innerHTML = '';
  stagedFiles.forEach((f, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'attach-thumb';
    if (f.type.startsWith('image/')) {
      thumb.innerHTML = `<img src="${f.url}" alt="${f.name}"><button class="attach-remove" onclick="event.stopPropagation()">✕</button>`;
    } else {
      thumb.innerHTML = `<span class="attach-name">${f.name}</span><button class="attach-remove" onclick="event.stopPropagation()">✕</button>`;
    }
    thumb.querySelector('.attach-remove').onclick = (e) => { e.stopPropagation(); onRemove(i); };
    container.appendChild(thumb);
  });
}
