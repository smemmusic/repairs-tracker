import { DISPLAY_READY_THRESHOLD } from '../domain/constants.js';
import { getLabelDef, LABELS } from '../domain/constants.js';
import { getScore } from '../domain/computed.js';

/**
 * Open the entry form panel and update button text.
 */
export function openForm() {
  document.getElementById('addEntryPanel').style.display = 'block';
  document.getElementById('addLogBtn').textContent = '← View log';
}

/**
 * Close the entry form panel and update button text.
 */
export function closeForm() {
  document.getElementById('addEntryPanel').style.display = 'none';
  document.getElementById('addLogBtn').textContent = '+ New entry';
}

/**
 * Toggle the form open/closed.
 */
export function toggleForm() {
  const panel = document.getElementById('addEntryPanel');
  if (panel.style.display === 'block') {
    closeForm();
  } else {
    openForm();
  }
}

/**
 * Show the add-log button (hidden until an instrument is selected).
 */
export function showFormButton() {
  document.getElementById('addLogBtn').style.display = '';
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
    contributorId: document.getElementById('entryContributor')?.value || null,
    formOpen: document.getElementById('addEntryPanel').style.display === 'block',
  };
}

/**
 * Populate the contributor dropdown.
 * @param {Array} contributors - array of { id, name }
 * @param {string|null} selectedUserId - the logged-in user's contributor id to pre-select
 */
export function populateContributors(contributors, selectedUserId) {
  const select = document.getElementById('entryContributor');
  if (!select) return;
  select.innerHTML = contributors.map(c =>
    `<option value="${c.id}"${c.id === selectedUserId ? ' selected' : ''}>${c.name}</option>`
  ).join('');
}

/**
 * Apply capability restrictions to the form controls.
 * Hides/disables controls the user can't use.
 * @param {Object} capabilities - current session capabilities
 */
export function applyCapabilities(capabilities) {
  const typeSelect = document.getElementById('entryType');
  const statusGroup = document.getElementById('statusGroup');
  const scoreGroup = document.getElementById('scoreGroup');
  const labelsGroup = document.getElementById('labelsFormGroup');
  const displayReadyGroup = document.getElementById('displayReadyGroup');
  const contributorGroup = document.getElementById('contributorGroup');

  // Restrict entry types for guests
  if (!capabilities.submitOtherEntryTypes) {
    Array.from(typeSelect.options).forEach(opt => {
      if (opt.value && opt.value !== 'fault_report') {
        opt.disabled = true;
        opt.style.display = 'none';
      }
    });
  } else {
    Array.from(typeSelect.options).forEach(opt => {
      opt.disabled = false;
      opt.style.display = '';
    });
  }

  // Hide status, score, labels, display-ready for guests
  if (statusGroup) statusGroup.style.display = capabilities.setStatus ? '' : 'none';
  if (scoreGroup) scoreGroup.style.display = capabilities.viewScores ? '' : 'none';
  if (labelsGroup) labelsGroup.style.display = capabilities.setLabels ? '' : 'none';
  if (displayReadyGroup) displayReadyGroup.style.display = capabilities.viewScores ? '' : 'none';
  if (contributorGroup) contributorGroup.style.display = capabilities.submitOtherEntryTypes ? '' : 'none';
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
  document.getElementById('statusHint').style.opacity = '0';

  const terminal = instrument.status === 'retired' || instrument.status === 'disposed';
  const statusSelect = document.getElementById('entryNewStatus');
  statusSelect.disabled = terminal;
  statusSelect.style.opacity = terminal ? '0.35' : '1';
}

/**
 * Configure the status select for terminal states.
 */
export function configureStatusSelect(instrument) {
  const terminal = instrument.status === 'retired' || instrument.status === 'disposed';
  const statusSelect = document.getElementById('entryNewStatus');
  statusSelect.disabled = terminal;
  statusSelect.style.opacity = terminal ? '0.35' : '1';
}

/**
 * Show status hint text (inferred or manual override).
 */
export function showStatusHint(text, color) {
  const hint = document.getElementById('statusHint');
  hint.textContent = text;
  hint.style.color = color;
  hint.style.opacity = '1';
}

/**
 * Clear status hint.
 */
export function clearStatusHint() {
  const hint = document.getElementById('statusHint');
  hint.textContent = '';
  hint.style.opacity = '0';
}

/**
 * Flash the notes field border red to indicate validation error.
 */
export function flashNotesError() {
  const el = document.getElementById('entryNotes');
  el.style.borderColor = 'var(--red)';
  setTimeout(() => { el.style.borderColor = ''; }, 1000);
}

/**
 * Render label toggle buttons in the form.
 * @param {Object} instrument - current instrument
 * @param {Object} pendingLabels - map of key → 'add'|'remove'
 * @param {Function} onToggle - callback(key, action) where action is 'add'|'remove'|'cancel'
 */
export function renderLabelsFormRow(instrument, pendingLabels, onToggle) {
  const row = document.getElementById('labelsFormRow');
  row.innerHTML = '';

  LABELS.forEach(({ key, label, cls }) => {
    const onInstrument = instrument.labels.includes(key);
    const pending = pendingLabels[key];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `label-toggle ${cls}`;

    if (onInstrument && pending !== 'remove') {
      btn.classList.add('active');
      btn.textContent = '✕ ' + label;
      btn.title = 'Click to remove this label';
      btn.onclick = () => onToggle(key, 'remove');
    } else if (pending === 'remove') {
      btn.classList.add('active', 'remove');
      btn.textContent = label;
      btn.title = 'Click to keep this label';
      btn.onclick = () => onToggle(key, 'cancel');
    } else if (pending === 'add') {
      btn.classList.add('active', 'add');
      btn.textContent = '+ ' + label;
      btn.title = 'Suggested — click to cancel';
      btn.onclick = () => onToggle(key, 'cancel');
    } else {
      btn.textContent = '+ ' + label;
      btn.title = 'Click to add this label';
      btn.onclick = () => onToggle(key, 'add');
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
    <span style="position:relative;display:inline-block;" class="dr-preview-wrap">
      <span style="font-family:var(--mono);font-size:10px;padding:3px 10px;border-radius:2px;
        border:1px solid ${allPass ? 'var(--green)' : 'var(--red)'};
        color:${allPass ? 'var(--green)' : 'var(--red)'};
        background:${allPass ? 'rgba(74,158,110,0.08)' : 'rgba(158,74,74,0.08)'};
        font-weight:500;opacity:${allPass ? '1' : '0.7'};cursor:default;
      ">${allPass ? '✓' : '✗'} Display ready</span>
      <span class="dr-tooltip">${checks.map(c =>
        `<span style="color:${c.pass ? 'var(--green)' : 'var(--red)'};">${c.pass ? '✓' : '✗'} ${c.label}</span>`
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
