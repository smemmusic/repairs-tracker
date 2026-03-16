import { STATUSES, LABELS } from '../domain/config.js';
import { DASHBOARD_NOTE_TRUNCATE } from '../domain/constants.js';
import { esc } from './shared.js';

/**
 * Render the dashboard into the given container.
 */
export function renderDashboard(container, stats, feed, caps, onSelect, onBack) {
  container.innerHTML = '';

  // Mobile back button
  const backBtn = document.createElement('button');
  backBtn.className = 'dash-back-btn btn-subtle';
  backBtn.textContent = '\u2190 Browse instruments';
  backBtn.addEventListener('click', onBack);
  container.appendChild(backBtn);

  // Stats cards
  const statsRow = document.createElement('div');
  statsRow.className = 'dash-stats';

  statsRow.appendChild(statCard('Instruments', stats.total));

  const statusDetail = STATUSES.map(s =>
    `<span class="dash-detail-item"><span class="status-dot s-${esc(s.key)}"></span>${stats.statusCounts[s.key] || 0} ${esc(s.label.toLowerCase())}</span>`
  ).join('');
  statsRow.appendChild(statCard('Status', null, statusDetail));

  const labelDetail = LABELS.map(l =>
    `<span class="dash-detail-item"><span class="label-tag label-tag-sm ${esc(l.cls)}">${stats.labelCounts[l.key] || 0}</span> ${esc(l.label.toLowerCase())}</span>`
  ).join('');
  statsRow.appendChild(statCard('Needs attention', stats.needsAttention, labelDetail));

  statsRow.appendChild(statCard('Display ready', `${stats.displayReady} / ${stats.total}`));

  container.appendChild(statsRow);

  // Activity feed
  const feedSection = document.createElement('div');
  feedSection.className = 'dash-feed';

  const feedTitle = document.createElement('div');
  feedTitle.className = 'dash-feed-title';
  feedTitle.textContent = 'Recent activity';
  feedSection.appendChild(feedTitle);

  if (!caps.viewLogHistory) {
    const msg = document.createElement('div');
    msg.className = 'dash-feed-empty';
    msg.textContent = 'Log in to view recent activity';
    feedSection.appendChild(msg);
  } else if (!feed.length) {
    const msg = document.createElement('div');
    msg.className = 'dash-feed-empty';
    msg.textContent = 'No activity yet';
    feedSection.appendChild(msg);
  } else {
    feed.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'dash-feed-item';

      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const author = entry.contributor_name || 'Visitor';
      const notes = entry.notes.length > DASHBOARD_NOTE_TRUNCATE
        ? entry.notes.slice(0, DASHBOARD_NOTE_TRUNCATE) + '...'
        : entry.notes;
      const statusTag = entry.status
        ? `<span class="status-change-tag tag-${esc(entry.status)}">→ ${esc(entry.status)}</span>` : '';

      item.innerHTML = `
        <div class="dash-feed-meta">
          <span class="dash-feed-date">${dateStr}</span>
          <span class="dash-feed-author">${esc(author)}</span>
        </div>
        <div class="dash-feed-body">
          <span class="entry-type-tag ${esc(entry.type)}">${esc(entry.type.replace(/_/g, ' '))}</span>
          ${statusTag}
          <span class="dash-feed-instrument">${esc(entry.instrumentName)}</span>
        </div>
        <div class="dash-feed-notes">${esc(notes)}</div>
      `;

      item.addEventListener('click', () => onSelect(entry.instrumentId));
      feedSection.appendChild(item);
    });
  }

  container.appendChild(feedSection);
}

function statCard(label, value, detailHtml) {
  const card = document.createElement('div');
  card.className = 'dash-stat-card';
  const valueHtml = value !== null && value !== undefined
    ? `<span class="dash-stat-value">${esc(String(value))}</span>` : '';
  card.innerHTML = `
    <div class="dash-stat-header">
      <span class="dash-stat-label">${esc(label)}</span>
      ${valueHtml}
    </div>
    ${detailHtml ? `<div class="dash-stat-detail">${detailHtml}</div>` : ''}
  `;
  return card;
}
