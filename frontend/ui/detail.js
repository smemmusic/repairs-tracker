import { getLabelDef, getDisplayReadyChecks } from '../domain/config.js';
import { displayReadyBadgeHTML, esc } from './shared.js';

/**
 * Render the instrument detail header (title, serial, status badge).
 */
export function renderDetailHeader(instrument) {
  document.getElementById('instrTitle').textContent = instrument.display_name;
  document.getElementById('instrId').textContent =
    `${instrument.airtable_id}  ·  ${instrument.serial_number ? 'S/N ' + instrument.serial_number : 'no serial number'}`;

  const badge = document.getElementById('statusBadge');
  badge.textContent = instrument.status;
  badge.className = `status-badge tag tag-md tag-${esc(instrument.status)}`;
}

/**
 * Render the location strip.
 */
export function renderLocationStrip(instrument) {
  document.getElementById('locationValue').textContent = instrument.location || '—';
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
 */
export function renderScoreStrip(instrument, capabilities) {
  const score = capabilities.viewScores ? instrument.score : null;

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
  const last = instrument.log[instrument.log.length - 1];
  document.getElementById('lastEntry').textContent = last
    ? new Date(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // Entry count
  document.getElementById('entryCount').textContent = instrument.log_count;
}

/**
 * Render the display-ready badge in the header.
 */
export function renderDisplayReadyBadge(instrument) {
  const el = document.getElementById('displayReadyBadge');
  if (!el) return;
  const checks = getDisplayReadyChecks(instrument.status, instrument.labels, instrument.score);
  el.innerHTML = displayReadyBadgeHTML(checks);
}
