import { getLabelDef } from '../domain/constants.js';

/**
 * Render all log entries for an instrument.
 * @param {Object} instrument - the instrument with its log array
 */
export function renderLog(instrument) {
  const area = document.getElementById('logEntries');
  area.innerHTML = '';

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

    const scoreTag = entry.score !== null
      ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text3);border:1px solid var(--border2);padding:2px 6px;border-radius:2px;">${entry.score}/10</span>` : '';

    const statusTag = entry.status
      ? `<span class="status-change-tag tag-${entry.status}">→ ${entry.status}</span>` : '';

    const labelTags = [
      ...(entry.labels_added || []).map(key => {
        const d = getLabelDef(key);
        return d ? `<span class="log-label-tag ${d.cls}">+ ${d.label}</span>` : '';
      }),
      ...(entry.labels_removed || []).map(key => {
        const d = getLabelDef(key);
        return d ? `<span class="log-label-tag" style="color:var(--text3);border-color:var(--border2);text-decoration:line-through;">− ${d.label}</span>` : '';
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

    const d = new Date(entry.date);
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `
      <div>
        <div class="log-date">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br>${d.getFullYear()}</div>
        <div class="log-author">${entry.author}</div>
      </div>
      <div>
        <div class="log-top">
          <span class="entry-type-tag ${entry.type}">${entry.type.replace('_', ' ')}</span>
          ${statusTag}${labelTags}${scoreTag}${scoreDelta}
        </div>
        <div class="log-notes">${entry.notes}</div>
        ${attachHtml}
      </div>`;
    area.appendChild(div);
  });
}
