import { getLoginUsers, login, loginAsGuest } from '../data/auth.js';

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
      <div class="login-subtitle">SMEM</div>
      <div class="login-note">Demo mode — password is <strong>smem</strong> for all users</div>
      <div class="login-form">
        <div class="login-field">
          <label class="login-label">User</label>
          <select class="login-select" id="loginUser">
            ${userOptions}
          </select>
        </div>
        <div class="login-field">
          <label class="login-label">Password</label>
          <input class="login-input" type="password" id="loginPassword" placeholder="smem">
        </div>
        <div id="loginError" class="login-error"></div>
        <button class="login-btn login-btn-primary" id="loginBtn">Log in</button>
        <div class="login-divider"><span>or</span></div>
        <button class="login-btn login-btn-guest" id="guestBtn">Continue without login</button>
      </div>
    </div>
  `;

  overlay.style.display = 'flex';

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const userId = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
      const session = await login(userId, password);
      overlay.style.display = 'none';
      onAuthenticated(session);
    } catch (e) {
      errorEl.textContent = e.message;
    }
  });

  document.getElementById('guestBtn').addEventListener('click', async () => {
    const session = await loginAsGuest();
    overlay.style.display = 'none';
    onAuthenticated(session);
  });

  // Allow Enter key to submit
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
}
