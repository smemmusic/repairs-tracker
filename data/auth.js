import { contributors } from './seed.js';

const DEMO_PASSWORD = 'smem';

const AUTHENTICATED_CAPABILITIES = {
  viewLogHistory: true,
  viewScores: true,
  submitFaultReport: true,
  submitOtherEntryTypes: true,
  setStatus: true,
  setLabels: true,
};

const GUEST_CAPABILITIES = {
  viewLogHistory: false,
  viewScores: false,
  submitFaultReport: true,
  submitOtherEntryTypes: false,
  setStatus: false,
  setLabels: false,
};

let currentSession = null;

/**
 * Log in with a drupal_user_id and password.
 * Returns { user, capabilities } or throws on failure.
 */
export async function login(userId, password) {
  if (password !== DEMO_PASSWORD) {
    throw new Error('Invalid password');
  }

  const contributor = contributors.find(c => c.drupal_user_id === userId);
  if (!contributor) {
    throw new Error('User not found');
  }

  currentSession = {
    user: { id: contributor.id, name: contributor.name },
    capabilities: { ...AUTHENTICATED_CAPABILITIES },
  };

  return currentSession;
}

/**
 * Continue as an unauthenticated guest.
 * Returns { user: null, capabilities } with limited permissions.
 */
export async function loginAsGuest() {
  currentSession = {
    user: null,
    capabilities: { ...GUEST_CAPABILITIES },
  };

  return currentSession;
}

/**
 * Get the current session, or null if not logged in.
 */
export async function getSession() {
  return currentSession;
}

/**
 * Log out and clear the session.
 */
export function logout() {
  currentSession = null;
}

/**
 * List contributors that have Drupal accounts (for the login dropdown).
 */
export function getLoginUsers() {
  return contributors.filter(c => c.drupal_user_id !== null);
}
