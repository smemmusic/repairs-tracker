import { contributors } from './seed.js';

import { DEMO_PASSWORD, STORAGE_KEY_SESSION } from '../domain/constants.js';

const AUTHENTICATED_CAPABILITIES = {
  viewLogHistory: true,
  viewScores: true,
  submitFaultReport: true,
  submitOtherEntryTypes: true,
  setStatus: true,
  setLabels: true,
  deleteLogEntry: true,
};

const GUEST_CAPABILITIES = {
  viewLogHistory: false,
  viewScores: false,
  submitFaultReport: true,
  submitOtherEntryTypes: false,
  setStatus: false,
  setLabels: false,
  deleteLogEntry: false,
};

let currentSession = null;

function persistSession() {
  if (currentSession) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentSession));
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

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

  persistSession();
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

  persistSession();
  return currentSession;
}

/**
 * Get the current session, or null if not logged in.
 * Restores from localStorage if available.
 */
export async function getSession() {
  if (!currentSession) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) currentSession = JSON.parse(stored);
    } catch (e) { /* ignore */ }
  }
  return currentSession;
}

/**
 * Log out and clear the session.
 */
export function logout() {
  currentSession = null;
  persistSession();
}

/**
 * List contributors that have Drupal accounts (for the login dropdown).
 */
export function getLoginUsers() {
  return contributors.filter(c => c.drupal_user_id !== null);
}
