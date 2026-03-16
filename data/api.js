import { instruments as seedData, contributors } from './seed.js';
import { getScore, isDisplayReady } from '../domain/computed.js';
import { getSession } from './auth.js';
import { inferStatusSuggestion, inferLabelSuggestions } from '../domain/inference.js';
import { STORAGE_KEY_INSTRUMENTS, Status, EntryType, Filter, partitionLabelActions } from '../domain/constants.js';
import { createLogEntry } from '../domain/models.js';

// In-memory store backed by localStorage — will be replaced by fetch() calls to FastAPI

function loadInstruments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_INSTRUMENTS);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore corrupt data */ }
  return structuredClone(seedData);
}

function persist() {
  localStorage.setItem(STORAGE_KEY_INSTRUMENTS, JSON.stringify(instruments));
}

/**
 * Reset all instrument data to seed state.
 */
export async function resetAllData() {
  localStorage.removeItem(STORAGE_KEY_INSTRUMENTS);
}

const instruments = loadInstruments();

/**
 * Get a contributor's display name by ID.
 */
export function getContributorName(contributorId) {
  const c = contributors.find(c => c.id === contributorId);
  return c ? c.name : 'Unknown';
}

/**
 * List instruments, optionally filtered by status or display readiness, and searched by name/serial.
 */
export async function listInstruments(filter = Filter.ALL, search = '') {
  let results = instruments;

  if (filter === Filter.DISPLAY_READY) {
    results = results.filter(inst => isDisplayReady(inst));
  } else if (filter !== Filter.ALL) {
    results = results.filter(inst => inst.status === filter);
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(inst =>
      inst.display_name.toLowerCase().includes(q)
      || (inst.serial_number && inst.serial_number.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Get a single instrument by ID, or null if not found.
 * Respects capabilities: strips log history and scores if not permitted.
 */
export async function getInstrument(id) {
  const inst = instruments.find(i => i.id === id) || null;
  if (!inst) return null;

  const session = await getSession();
  const caps = session?.capabilities || {};

  // Return a view of the instrument respecting permissions
  if (!caps.viewLogHistory) {
    return { ...inst, log: [] };
  }

  return inst;
}

/**
 * Get the raw instrument without permission filtering (for internal use).
 */
export async function getInstrumentRaw(id) {
  return instruments.find(i => i.id === id) || null;
}

/**
 * Add a log entry to an instrument. Applies status and label changes.
 * Enforces permissions from the current session.
 * Returns { instrument, logEntry }.
 */
export async function addLogEntry(instrumentId, entry) {
  const session = await getSession();
  const caps = session?.capabilities || {};

  // Permission enforcement
  const isFaultReport = entry.type === EntryType.FAULT_REPORT;
  if (isFaultReport && !caps.submitFaultReport) {
    throw new Error('Permission denied: cannot submit fault reports');
  }
  if (!isFaultReport && !caps.submitOtherEntryTypes) {
    throw new Error('Permission denied: login required for this entry type');
  }
  if (entry.status && !caps.setStatus && !isFaultReport) {
    throw new Error('Permission denied: login required to set status');
  }
  if ((entry.labelsAdded?.length || entry.labelsRemoved?.length) && !caps.setLabels && !isFaultReport) {
    throw new Error('Permission denied: login required to modify labels');
  }

  const inst = instruments.find(i => i.id === instrumentId);
  if (!inst) throw new Error(`Instrument not found: ${instrumentId}`);

  // For fault reports from guests, override client-sent status/labels with server-inferred values
  if (isFaultReport && (!caps.setStatus || !caps.setLabels)) {
    const suggestedStatus = inferStatusSuggestion(EntryType.FAULT_REPORT, inst.status);
    const suggestedLabels = inferLabelSuggestions(EntryType.FAULT_REPORT, suggestedStatus || inst.status, inst.labels);

    if (!caps.setStatus) {
      entry.status = suggestedStatus;
    }
    if (!caps.setLabels) {
      const { added, removed } = partitionLabelActions(suggestedLabels);
      entry.labelsAdded = added;
      entry.labelsRemoved = removed;
    }
  }

  // Determine effective status change
  const effectiveStatus = (entry.status && entry.status !== inst.status)
    ? entry.status : null;
  if (effectiveStatus) {
    inst.status = effectiveStatus;
  }

  // Determine effective score change
  const currentScore = getScore(inst);
  const effectiveScore = (entry.score != null && entry.score !== currentScore)
    ? entry.score : null;

  // Apply label changes
  const labelsAdded = [];
  const labelsRemoved = [];
  if (entry.labelsAdded) {
    for (const key of entry.labelsAdded) {
      if (!inst.labels.includes(key)) {
        inst.labels.push(key);
        labelsAdded.push(key);
      }
    }
  }
  if (entry.labelsRemoved) {
    for (const key of entry.labelsRemoved) {
      const idx = inst.labels.indexOf(key);
      if (idx > -1) {
        inst.labels.splice(idx, 1);
        labelsRemoved.push(key);
      }
    }
  }

  // Resolve contributor from session — null means unauthenticated visitor
  const contributorId = session?.user?.id || null;

  const logEntry = createLogEntry({
    type: entry.type,
    date: entry.date || new Date().toISOString().split('T')[0],
    contributor_id: contributorId,
    notes: entry.notes,
    status: effectiveStatus,
    score: effectiveScore,
    location: entry.location || null,
    labels_added: labelsAdded,
    labels_removed: labelsRemoved,
    attachments: entry.attachments || [],
  });

  inst.log.push(logEntry);
  persist();

  return { instrument: inst, logEntry };
}

/**
 * Recompute instrument status and labels from its log entries.
 */
function recomputeState(inst) {
  let status = Status.UNKNOWN;
  for (const entry of inst.log) {
    if (entry.status) status = entry.status;
  }
  inst.status = status;

  const labels = new Set();
  for (const entry of inst.log) {
    for (const key of (entry.labels_added || [])) labels.add(key);
    for (const key of (entry.labels_removed || [])) labels.delete(key);
  }
  inst.labels = [...labels];
}

/**
 * Edit a log entry's notes, then recompute instrument state.
 * Returns the updated instrument.
 */
export async function editLogEntry(instrumentId, logEntryId, updates) {
  const session = await getSession();
  const caps = session?.capabilities || {};

  if (!caps.editLogEntry) {
    throw new Error('Permission denied: login required to edit log entries');
  }

  const inst = instruments.find(i => i.id === instrumentId);
  if (!inst) throw new Error(`Instrument not found: ${instrumentId}`);

  const entry = inst.log.find(e => e.id === logEntryId);
  if (!entry) throw new Error(`Log entry not found: ${logEntryId}`);

  if (updates.notes !== undefined) entry.notes = updates.notes;
  if (updates.status !== undefined) entry.status = updates.status || null;
  if (updates.score !== undefined) entry.score = updates.score;
  if (updates.location !== undefined) entry.location = updates.location || null;
  if (updates.labels_added !== undefined) entry.labels_added = updates.labels_added;
  if (updates.labels_removed !== undefined) entry.labels_removed = updates.labels_removed;

  recomputeState(inst);
  persist();
  return inst;
}

/**
 * Delete a log entry and recompute instrument state from remaining entries.
 * Returns the updated instrument.
 */
export async function deleteLogEntry(instrumentId, logEntryId) {
  const session = await getSession();
  const caps = session?.capabilities || {};

  if (!caps.deleteLogEntry) {
    throw new Error('Permission denied: login required to delete log entries');
  }

  const inst = instruments.find(i => i.id === instrumentId);
  if (!inst) throw new Error(`Instrument not found: ${instrumentId}`);

  const idx = inst.log.findIndex(e => e.id === logEntryId);
  if (idx === -1) throw new Error(`Log entry not found: ${logEntryId}`);

  inst.log.splice(idx, 1);
  recomputeState(inst);
  persist();
  return inst;
}
