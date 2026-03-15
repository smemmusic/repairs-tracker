import { getLabelDef } from '../domain/constants.js';
import { getScore, getLocation, getDisplayReadyChecks } from '../domain/computed.js';
import { displayReadyBadgeHTML, esc } from './shared.js';

/**
 * Render the instrument detail header (title, serial, location, status badge).
 * @param {Object} instrument - instrument (may be permission-filtered)
 * @param {Object} rawInstrument - instrument with full log (for location)
 */
export function renderDetailHeader(instrument) {
  document.getElementById('instrTitle').textContent = instrument.display_name;
  document.getElementById('instrId').textContent =
    `${instrument.airtable_id}  ·  ${instrument.serial_number ? 'S/N ' + instrument.serial_number : 'no serial number'}`;

  const badge = document.getElementById('statusBadge');
  badge.textContent = instrument.status;
  badge.className = `status-badge tag-${esc(instrument.status)}`;
}

/**
 * Render the location strip.
 * @param {Object} rawInstrument - instrument with full log (for location derivation)
 */
export function renderLocationStrip(rawInstrument) {
  const location = getLocation(rawInstrument);
  document.getElementById('locationValue').textContent = location || '—';
}

/**
 * Render the labels strip below the header.
 */
export function renderLabelsStrip(instrument) {
  const strip = document.getElementById('labelsStrip');
  strip.innerHTML = '';

  if (!instrument.labels.length) {
    strip.innerHTML = '<span class="labels-empty">No active labels</span>';
    return;
  }

  const lbl = document.createElement('span');
  lbl.className = 'labels-empty';
  lbl.textContent = 'Labels:';
  strip.appendChild(lbl);

  instrument.labels.forEach(key => {
    const def = getLabelDef(key);
    if (!def) return;
    const tag = document.createElement('span');
    tag.className = `label-tag ${def.cls}`;
    tag.textContent = def.label;
    strip.appendChild(tag);
  });
}

/**
 * Render the score bar and related stats.
 * @param {Object} instrument - instrument (may have empty log if guest)
 * @param {Object} capabilities - current session capabilities
 * @param {Object} rawInstrument - instrument with full log (for score/stats even when log is hidden)
 */
export function renderScoreStrip(instrument, capabilities, rawInstrument) {
  const src = rawInstrument || instrument;
  const score = capabilities.viewScores ? getScore(src) : null;

  // Score bar
  const bar = document.getElementById('scoreBar');
  bar.innerHTML = '';
  if (capabilities.viewScores) {
    for (let i = 1; i <= 10; i++) {
      const pip = document.createElement('div');
      const filled = score && i <= score;
      pip.className = 'score-pip' + (filled ? ' filled' + (score <= 3 ? ' low' : score >= 8 ? ' high' : '') : '');
      bar.appendChild(pip);
    }
    document.getElementById('scoreValue').textContent = score ? `${score}/10` : '—';
  } else {
    document.getElementById('scoreValue').textContent = '—';
  }

  // Last entry date
  const last = src.log[src.log.length - 1];
  document.getElementById('lastEntry').textContent = last
    ? new Date(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // Entry count
  document.getElementById('entryCount').textContent = src.log.length;
}

/**
 * Render the display-ready badge in the header.
 */
export function renderDisplayReadyBadge(instrument) {
  const el = document.getElementById('displayReadyBadge');
  if (!el) return;
  const score = getScore(instrument);
  const checks = getDisplayReadyChecks(instrument.status, instrument.labels, score);
  el.innerHTML = displayReadyBadgeHTML(checks);
}
