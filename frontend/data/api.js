import { request, endpoints } from './client.js';

export async function getDashboardStats() {
  return request('GET', endpoints.dashboardStats());
}

export async function getRecentActivity(limit) {
  const params = limit ? `?limit=${limit}` : '';
  return request('GET', endpoints.dashboardActivity() + params);
}

export async function listInstruments(filter = 'all', search = '') {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('filter', filter);
  if (search) params.set('search', search);
  const qs = params.toString();
  return request('GET', endpoints.instruments() + (qs ? '?' + qs : ''));
}

export async function getInstrument(id) {
  return request('GET', endpoints.instrument(id));
}

export async function addLogEntry(instrumentId, entry) {
  return request('POST', endpoints.logEntries(instrumentId), {
    type: entry.type,
    date: entry.date,
    notes: entry.notes,
    status: entry.status || null,
    score: entry.score || null,
    location: entry.location || null,
    labels_added: entry.labelsAdded || [],
    labels_removed: entry.labelsRemoved || [],
  });
}

export async function editLogEntry(instrumentId, logEntryId, updates) {
  return request('PUT', endpoints.logEntry(instrumentId, logEntryId), updates);
}

export async function deleteLogEntry(instrumentId, logEntryId) {
  return request('DELETE', endpoints.logEntry(instrumentId, logEntryId));
}

export async function resetAllData() {
  return request('POST', endpoints.adminReset());
}
