import { getLabelDef } from '../domain/constants.js';
import { getScore, isDisplayReady } from '../domain/computed.js';

/**
 * Render the instrument detail header (title, serial, status badge).
 */
export function renderDetailHeader(instrument) {
  document.getElementById('instrTitle').textContent = instrument.display_name;
  document.getElementById('instrId').textContent =
    `${instrument.airtable_id}  ·  ${instrument.serial_number ? 'S/N ' + instrument.serial_number : 'no serial number'}`;

  const badge = document.getElementById('statusBadge');
  badge.textContent = instrument.status;
  badge.className = `status-badge tag-${instrument.status}`;
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
  const ready = isDisplayReady(instrument);
  el.innerHTML = `<span style="
    font-family: var(--mono);
    font-size: 10px;
    padding: 4px 10px;
    border: 1px solid ${ready ? 'var(--green)' : 'var(--red)'};
    color: ${ready ? 'var(--green)' : 'var(--red)'};
    background: ${ready ? 'rgba(74,158,110,0.08)' : 'rgba(158,74,74,0.08)'};
    border-radius: 2px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    opacity: ${ready ? '1' : '0.7'};
    white-space: nowrap;
  ">${ready ? '✓' : '✗'} Display ready</span>`;
}
