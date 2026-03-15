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
