import { getLoginUsers, login, loginAsGuest } from '../data/auth.js';
import { resetAllData } from '../data/api.js';
import { APP_NAME, DEMO_PASSWORD } from '../domain/constants.js';

/**
 * Render and show the login overlay.
 * @param {Function} onAuthenticated - callback(session) after successful login or guest entry
 */
export function showLoginScreen(onAuthenticated) {
  const overlay = document.getElementById('loginOverlay');
  const users = getLoginUsers();

  const userOptions = '<option value="">— select user —</option>' + users.map(u =>
    `<option value="${u.drupal_user_id}">${u.name}</option>`
  ).join('');

  overlay.innerHTML = `
    <div class="login-box">
      <div class="login-title">Repair Tracker</div>
      <div class="login-subtitle">${APP_NAME}</div>
      <div class="login-note">Demo mode — password is <strong>${DEMO_PASSWORD}</strong> for all users.<br>All data is stored locally in your browser. Feel free to experiment.</div>
      <div class="login-form">
        <div class="login-field">
          <label class="login-label">User</label>
          <select class="login-select" id="loginUser">
            ${userOptions}
          </select>
        </div>
        <div class="login-field">
          <label class="login-label">Password</label>
          <input class="login-input" type="password" id="loginPassword" placeholder="${DEMO_PASSWORD}">
        </div>
        <div id="loginError" class="login-error"></div>
        <button class="login-btn login-btn-primary" id="loginBtn">Log in</button>
        <div class="login-divider"><span>or</span></div>
        <button class="login-btn login-btn-guest" id="guestBtn">Continue without login</button>
      </div>
      <div class="login-reset">
        <button class="login-reset-btn" id="resetBtn">Reset demo data</button>
        <span class="login-reset-hint">Clears all changes and restores seed data</span>
      </div>
    </div>
  `;

  overlay.classList.add('visible');

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const userId = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
      const session = await login(userId, password);
      overlay.classList.remove('visible');
      onAuthenticated(session);
    } catch (e) {
      errorEl.textContent = e.message;
    }
  });

  document.getElementById('guestBtn').addEventListener('click', async () => {
    const session = await loginAsGuest();
    overlay.classList.remove('visible');
    onAuthenticated(session);
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset the demo data?')) return;
    await resetAllData();
    window.location.reload();
  });

  // Allow Enter key to submit
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
}
