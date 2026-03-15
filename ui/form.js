import { LABELS, EntryType, LabelAction } from '../domain/constants.js';
import { getScore, getDisplayReadyChecks } from '../domain/computed.js';
import { displayReadyBadgeHTML, esc } from './shared.js';

/**
 * Open the entry form panel and update button text.
 */
export function openForm() {
  document.getElementById('addEntryPanel').classList.add('open');
  document.getElementById('addLogBtn').textContent = '\u2190 View log';
}

/**
 * Close the entry form panel and update button text.
 */
export function closeForm() {
  document.getElementById('addEntryPanel').classList.remove('open');
  document.getElementById('addLogBtn').textContent = '+ New entry';
  setEditMode(false);
}

/**
 * Set the form to edit mode or back to create mode.
 */
export function setEditMode(editing) {
  const title = document.getElementById('addEntryTitle');
  const btn = document.getElementById('submitBtn');
  if (editing) {
    title.textContent = 'Edit log entry';
    btn.textContent = 'Save changes';
  } else {
    title.textContent = 'New log entry';
    btn.textContent = 'Log entry';
  }
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
    location: document.getElementById('entryLocation').value.trim(),
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
      if (opt.value && opt.value !== EntryType.FAULT_REPORT) {
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

  // Score, labels, location, display-ready: hidden for guests
  const labelsGroup = document.getElementById('labelsFormGroup');
  const locationGroup = document.getElementById('locationGroup');
  if (scoreGroup) scoreGroup.classList.toggle('hidden', isGuest);
  if (labelsGroup) labelsGroup.classList.toggle('hidden', isGuest);
  if (locationGroup) locationGroup.classList.toggle('hidden', isGuest);
  if (displayReadyGroup) displayReadyGroup.classList.toggle('hidden', isGuest);
}

/**
 * Populate form fields from a values object (used for draft restore and reset).
 */
export function setFormValues(values) {
  document.getElementById('entryType').value = values.type || '';
  document.getElementById('entryNewStatus').value = values.status || 'unknown';
  document.getElementById('entryScore').value = values.score || '5';
  document.getElementById('entryDate').value = values.date || new Date().toISOString().split('T')[0];
  document.getElementById('entryLocation').value = values.location || '';
  document.getElementById('entryNotes').value = values.notes || '';
  document.getElementById('submitBtn').disabled = !values.type;
  document.getElementById('entryNewStatus').disabled = !values.type;
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
 * @param {Object} pendingLabels - map of key → LabelAction
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

    if (onInstrument && pending !== LabelAction.REMOVE) {
      btn.classList.add('active');
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Click to remove this label';
        btn.onclick = () => onToggle(key, LabelAction.REMOVE);
      }
    } else if (pending === LabelAction.REMOVE) {
      btn.classList.add('active', 'remove');
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Click to keep this label';
        btn.onclick = () => onToggle(key, LabelAction.CANCEL);
      }
    } else if (pending === LabelAction.ADD) {
      btn.classList.add('active', 'add');
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Suggested — click to cancel';
        btn.onclick = () => onToggle(key, LabelAction.CANCEL);
      }
    } else {
      btn.textContent = label;
      if (!readOnly) {
        btn.title = 'Click to add this label';
        btn.onclick = () => onToggle(key, LabelAction.ADD);
      }
    }

    row.appendChild(btn);
  });
}

/**
 * Render label editor for edit mode — shows raw deltas (what this entry adds/removes).
 * @param {Object} pendingLabels - map of key → LabelAction
 * @param {Function} onToggle - callback(key, action)
 */
export function renderLabelsEditRow(pendingLabels, onToggle) {
  const row = document.getElementById('labelsFormRow');
  row.innerHTML = '';

  // "Added" section
  const addedLabel = document.createElement('span');
  addedLabel.className = 'labels-empty';
  addedLabel.textContent = 'Added:';
  row.appendChild(addedLabel);

  LABELS.forEach(({ key, label, cls }) => {
    const isAdded = pendingLabels[key] === LabelAction.ADD;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `label-toggle ${cls}`;
    if (isAdded) {
      btn.classList.add('active', 'add');
      btn.textContent = label;
      btn.title = 'Click to remove from this entry';
      btn.onclick = () => onToggle(key, LabelAction.CANCEL);
    } else {
      btn.textContent = label;
      btn.title = 'Click to add to this entry';
      btn.onclick = () => onToggle(key, LabelAction.ADD);
    }
    row.appendChild(btn);
  });

  // Separator
  const sep = document.createElement('span');
  sep.className = 'labels-empty';
  sep.textContent = 'Removed:';
  sep.style.marginLeft = '12px';
  row.appendChild(sep);

  LABELS.forEach(({ key, label, cls }) => {
    const isRemoved = pendingLabels[key] === LabelAction.REMOVE;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `label-toggle ${cls}`;
    if (isRemoved) {
      btn.classList.add('active', 'remove');
      btn.textContent = label;
      btn.title = 'Click to keep on this entry';
      btn.onclick = () => onToggle(key, LabelAction.CANCEL);
    } else {
      btn.textContent = label;
      btn.title = 'Click to remove via this entry';
      btn.onclick = () => onToggle(key, LabelAction.REMOVE);
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

  const checks = getDisplayReadyChecks(projectedStatus, projectedLabels, projectedScore);
  container.innerHTML = displayReadyBadgeHTML(checks);
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
      thumb.innerHTML = `<img src="${esc(f.url)}" alt="${esc(f.name)}"><button class="attach-remove">✕</button>`;
    } else {
      thumb.innerHTML = `<span class="attach-name">${esc(f.name)}</span><button class="attach-remove">✕</button>`;
    }
    thumb.querySelector('.attach-remove').onclick = (e) => { e.stopPropagation(); onRemove(i); };
    container.appendChild(thumb);
  });
}
