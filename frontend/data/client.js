// ── API client ──────────────────────────────────────────────────────
// Single source of truth for the API base path, endpoint definitions,
// and the shared request function.

const BASE = '/api';

export const endpoints = Object.freeze({
  // config
  config:              () => '/config',

  // auth
  login:               () => '/auth/login',
  guest:               () => '/auth/guest',
  session:             () => '/auth/session',
  logout:              () => '/auth/logout',
  users:               () => '/auth/users',

  // dashboard
  dashboardStats:      () => '/dashboard/stats',
  dashboardActivity:   () => '/dashboard/activity',

  // instruments
  instruments:         () => '/instruments',
  instrument:          (id) => `/instruments/${id}`,

  // log entries
  logEntries:          (instrumentId) => `/instruments/${instrumentId}/log`,
  logEntry:            (instrumentId, entryId) => `/instruments/${instrumentId}/log/${entryId}`,

  // attachments
  uploadAttachment:    () => '/attachments/upload',

  // admin
  adminReset:          () => '/admin/reset',
});

export async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}
