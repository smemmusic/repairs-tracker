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
    attachment_ids: entry.attachmentIds || [],
  });
}

export async function editLogEntry(instrumentId, logEntryId, updates) {
  return request('PUT', endpoints.logEntry(instrumentId, logEntryId), updates);
}

export async function deleteLogEntry(instrumentId, logEntryId) {
  return request('DELETE', endpoints.logEntry(instrumentId, logEntryId));
}

/**
 * Upload a file attachment. Returns { id, file_name, mime_type, url }.
 */
export async function uploadAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api' + endpoints.uploadAttachment(), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export async function resetAllData() {
  return request('POST', endpoints.adminReset());
}
