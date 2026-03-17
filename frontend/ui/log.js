import { getLabelDef } from '../domain/config.js';
import { esc } from './shared.js';

/**
 * Render all log entries for an instrument.
 */
export function renderLog(instrument, capabilities, onEdit, onDelete) {
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

  [...instrument.log].reverse().forEach((entry) => {
    const scoreTag = (capabilities.viewScores && entry.score !== null)
      ? `<span class="log-score-tag">${entry.score}/10</span>` : '';

    const statusTag = entry.status
      ? `<span class="status-change-tag tag-${esc(entry.status)}">→ ${esc(entry.status)}</span>` : '';

    const locationTag = entry.location
      ? `<span class="log-location-tag">→ ${esc(entry.location)}</span>` : '';

    const labelTags = [
      ...(entry.labels_added || []).map(key => {
        const d = getLabelDef(key);
        return d ? `<span class="log-label-tag ${d.cls}">+ ${esc(d.label)}</span>` : '';
      }),
      ...(entry.labels_removed || []).map(key => {
        const d = getLabelDef(key);
        return d ? `<span class="log-label-tag removed">${esc(d.label)}</span>` : '';
      }),
    ].join('');

    const attachments = entry.attachments || [];
    const attachHtml = attachments.length ? `<div class="log-attachments">${attachments.map(a => {
      if (a.mime_type && a.mime_type.startsWith('image/')) {
        return `<div class="log-attach-thumb"><img src="${esc(a.url)}" alt="${esc(a.file_name)}"></div>`;
      } else {
        return `<div class="log-attach-thumb"><span class="attach-file-icon">&#128196;</span><span class="attach-name">${esc(a.file_name)}</span></div>`;
      }
    }).join('')}</div>` : '';

    const authorName = entry.contributor_name || 'Visitor';

    const editBtn = (capabilities.editLogEntry && onEdit)
      ? `<button class="log-action-btn log-edit-btn" title="Edit entry">✎</button>` : '';
    const deleteBtn = (capabilities.deleteLogEntry && onDelete)
      ? `<button class="log-action-btn log-delete-btn" title="Delete entry">✕</button>` : '';

    const d = new Date(entry.date);
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `
      <div>
        <div class="log-date">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div class="log-author">${esc(authorName)}</div>
      </div>
      <div>
        <div class="log-top">
          <span class="entry-type-tag ${esc(entry.type)}">${esc(entry.type.replace('_', ' '))}</span>
          ${statusTag}${locationTag}${labelTags}${scoreTag}
          ${editBtn}${deleteBtn}
        </div>
        <div class="log-notes">${esc(entry.notes)}</div>
        ${attachHtml}
      </div>`;

    // Wire up click handlers for attachments
    div.querySelectorAll('.log-attach-thumb').forEach((thumb, i) => {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', () => window.open(attachments[i].url, '_blank'));
    });

    if (capabilities.editLogEntry && onEdit) {
      div.querySelector('.log-edit-btn').addEventListener('click', () => onEdit(entry.id));
    }
    if (capabilities.deleteLogEntry && onDelete) {
      div.querySelector('.log-delete-btn').addEventListener('click', () => onDelete(entry.id));
    }

    area.appendChild(div);
  });
}
