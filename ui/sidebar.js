import { STATUSES, Filter } from '../domain/constants.js';
import { getLabelDef } from '../domain/constants.js';
import { isDisplayReady } from '../domain/computed.js';
import { esc } from './shared.js';

/**
 * Update the sidebar header to show the logged-in user.
 * @param {Object} session - { user, capabilities }
 */
export function renderUserInfo(session) {
  const el = document.getElementById('userInfo');
  if (!el) return;
  if (session.user) {
    el.textContent = session.user.name;
    el.className = 'user-info-authenticated';
  } else {
    el.textContent = 'Guest';
    el.className = 'user-info-guest';
  }
}

/**
 * Render filter chips in the sidebar.
 * @param {Function} onFilter - callback(filterKey) when a filter is clicked
 */
export function renderFilters(onFilter) {
  const container = document.getElementById('sidebarFilters');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-chip active';
  allBtn.textContent = 'All';
  allBtn.onclick = function () { setActiveChip(this); onFilter(Filter.ALL); };
  container.appendChild(allBtn);

  STATUSES.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip';
    btn.textContent = s.label;
    btn.onclick = function () { setActiveChip(this); onFilter(s.key); };
    container.appendChild(btn);
  });

  const dr = document.createElement('button');
  dr.className = 'filter-chip';
  dr.textContent = 'Display ready';
  dr.onclick = function () { setActiveChip(this); onFilter(Filter.DISPLAY_READY); };
  container.appendChild(dr);
}

function setActiveChip(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

/**
 * Render the instrument list in the sidebar.
 * @param {Array} instruments - filtered list of instruments to display
 * @param {string|null} selectedId - currently selected instrument ID
 * @param {Function} onSelect - callback(instrumentId) when an instrument is clicked
 */
export function renderInstrumentList(instruments, selectedId, onSelect) {
  const list = document.getElementById('instrumentList');
  list.innerHTML = '';

  instruments.forEach(inst => {
    const div = document.createElement('div');
    div.className = 'instrument-item' + (inst.id === selectedId ? ' active' : '');
    div.onclick = () => onSelect(inst.id);

    const labelPips = inst.labels.map(l => {
      const def = getLabelDef(l);
      return def ? `<span class="label-tag label-tag-sm ${def.cls}">${def.label}</span>` : '';
    }).join('');

    const displayReady = isDisplayReady(inst);

    div.innerHTML = `
      <div class="instrument-name">${esc(inst.display_name)}</div>
      <div class="instrument-serial">${inst.serial_number ? 'S/N ' + esc(inst.serial_number) : 'no serial'}</div>
      <div class="instrument-meta">
        <div class="status-dot s-${esc(inst.status)}"></div>
        <span class="status-label-small">${esc(inst.status)}</span>
        ${displayReady ? '<span class="display-ready-tag-sm">display ready</span>' : ''}
        <span class="entry-count">${inst.log.length}</span>
      </div>
      ${inst.labels.length ? `<div class="label-pips">${labelPips}</div>` : ''}
    `;
    list.appendChild(div);
  });
}
