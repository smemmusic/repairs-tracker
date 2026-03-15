import { getLabelDef } from '../domain/constants.js';
import { getContributorName } from '../data/api.js';

/**
 * Render all log entries for an instrument.
 * @param {Object} instrument - the instrument with its log array
 * @param {Object} capabilities - current session capabilities
 * @param {Function|null} onDelete - callback(logEntryId) when delete is clicked, null to hide delete buttons
 */
export function renderLog(instrument, capabilities, onDelete) {
  const area = document.getElementById('logEntries');
  area.innerHTML = '';

  if (!capabilities.viewLogHistory) {
    area.innerHTML = '<div class="empty-state">Log in to view full repair history</div>';
    return;
  }

  if (!instrument.log.length) {
    area.innerHTML = '<div class="empty-state">No log entries yet</div>';
    return;
  }

  [...instrument.log].reverse().forEach((entry, i, arr) => {
    const prev = arr[i + 1];
    const prevScore = prev ? prev.score : null;
    let scoreDelta = '';
    if (entry.score !== null && prevScore !== null) {
      const diff = entry.score - prevScore;
      if (diff > 0) scoreDelta = `<span class="condition-change up">▲ ${diff}</span>`;
      else if (diff < 0) scoreDelta = `<span class="condition-change down">▼ ${Math.abs(diff)}</span>`;
    }

    const scoreTag = (capabilities.viewScores && entry.score !== null)
      ? `<span class="log-score-tag">${entry.score}/10</span>` : '';

    const statusTag = entry.status
      ? `<span class="status-change-tag tag-${entry.status}">→ ${entry.status}</span>` : '';

    const labelTags = [
      ...(entry.labels_added || []).map(key => {
        const d = getLabelDef(key);
        return d ? `<span class="log-label-tag ${d.cls}">+ ${d.label}</span>` : '';
      }),
      ...(entry.labels_removed || []).map(key => {
        const d = getLabelDef(key);
        return d ? `<span class="log-label-tag removed">− ${d.label}</span>` : '';
      }),
    ].join('');

    const attachments = entry.attachments || [];
    const attachHtml = attachments.length ? `<div class="log-attachments">${attachments.map(a => {
      if (a.type && a.type.startsWith('image/')) {
        return `<div class="log-attach-thumb" onclick="window.open('${a.url}','_blank')"><img src="${a.url}" alt="${a.name}"></div>`;
      } else {
        return `<div class="log-attach-thumb" onclick="window.open('${a.url}','_blank')"><span class="attach-name">${a.name}</span></div>`;
      }
    }).join('')}</div>` : '';

    // Resolve contributor name — null means visitor
    const authorName = entry.contributor_id
      ? getContributorName(entry.contributor_id)
      : 'Visitor';

    const deleteBtn = (capabilities.deleteLogEntry && onDelete)
      ? `<button class="log-delete-btn" data-id="${entry.id}" title="Delete entry">✕</button>` : '';

    const d = new Date(entry.date);
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `
      <div>
        <div class="log-date">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br>${d.getFullYear()}</div>
        <div class="log-author">${authorName}</div>
      </div>
      <div>
        <div class="log-top">
          <span class="entry-type-tag ${entry.type}">${entry.type.replace('_', ' ')}</span>
          ${statusTag}${labelTags}${scoreTag}${scoreDelta}
          ${deleteBtn}
        </div>
        <div class="log-notes">${entry.notes}</div>
        ${attachHtml}
      </div>`;

    if (capabilities.deleteLogEntry && onDelete) {
      div.querySelector('.log-delete-btn').addEventListener('click', () => onDelete(entry.id));
    }

    area.appendChild(div);
  });
}
