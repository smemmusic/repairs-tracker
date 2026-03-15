import { STATUSES } from '../domain/constants.js';

/**
 * Open the status modal for a given instrument.
 * @param {Object} instrument - current instrument
 * @param {Function} onSelect - callback(statusKey) when a status is chosen
 */
export function openStatusModal(instrument, onSelect) {
  const opts = document.getElementById('statusOptions');
  opts.innerHTML = '';

  STATUSES.forEach(s => {
    const div = document.createElement('div');
    div.className = 'status-option';
    div.onclick = () => onSelect(s.key);
    div.innerHTML = `
      <div class="status-dot s-${s.key}"></div>
      <div>
        <div class="status-option-label" style="${s.key === instrument.status ? 'color:var(--amber)' : ''}">${s.label}${s.key === instrument.status ? ' ✓' : ''}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text3);margin-top:1px;">${s.desc}</div>
      </div>`;
    opts.appendChild(div);
  });

  document.getElementById('statusModal').classList.add('open');
}

/**
 * Close the status modal.
 */
export function closeStatusModal(event) {
  if (event && event.target !== document.getElementById('statusModal')) return;
  document.getElementById('statusModal').classList.remove('open');
}
