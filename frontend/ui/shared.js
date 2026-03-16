/**
 * Escape a string for safe insertion into HTML.
 */
export function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML.replace(/\n/g, '<br/>');
}

/**
 * Show a confirmation modal. Returns a promise that resolves true (confirm) or false (cancel).
 * @param {string} message - the confirmation message
 * @param {string} [confirmLabel='Delete'] - text for the confirm button
 */
export function confirmModal(message, confirmLabel = 'Delete') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const msg = document.createElement('div');
    msg.className = 'confirm-message';
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn confirm-cancel btn-subtle';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn confirm-danger';
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    box.appendChild(msg);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('visible'));

    function close(result) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

/**
 * Render a display-ready badge with tooltip as an HTML string.
 * @param {Array} checks - array of { label, pass }
 */
export function displayReadyBadgeHTML(checks) {
  const allPass = checks.every(c => c.pass);
  return `
    <span class="dr-preview-wrap">
      <span class="display-ready-badge ${allPass ? 'pass' : 'fail'}">${allPass ? '\u2713' : '\u2717'} Display ready</span>
      <span class="dr-tooltip">${checks.map(c =>
        `<span class="${c.pass ? 'dr-check-pass' : 'dr-check-fail'}">${c.pass ? '\u2713' : '\u2717'} ${c.label}</span>`
      ).join('')}</span>
    </span>`;
}
