import { instruments as seedData, contributors } from './seed.js';
import { getScore, isDisplayReady } from '../domain/computed.js';
import { getSession } from './auth.js';

// In-memory store backed by localStorage — will be replaced by fetch() calls to FastAPI
import { STORAGE_KEY_INSTRUMENTS } from '../domain/constants.js';

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

const instruments = loadInstruments();

/**
 * List all contributors.
 */
export async function listContributors() {
  return contributors;
}

/**
 * Get a contributor by ID, or null.
 */
export async function getContributor(id) {
  return contributors.find(c => c.id === id) || null;
}

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
export async function listInstruments(filter = 'all', search = '') {
  let results = instruments;

  if (filter === 'display_ready') {
    results = results.filter(inst => isDisplayReady(inst));
  } else if (filter !== 'all') {
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
  if (entry.type === 'fault_report' && !caps.submitFaultReport) {
    throw new Error('Permission denied: cannot submit fault reports');
  }
  if (entry.type !== 'fault_report' && !caps.submitOtherEntryTypes) {
    throw new Error('Permission denied: login required for this entry type');
  }
  if (entry.status && !caps.setStatus) {
    throw new Error('Permission denied: login required to set status');
  }
  if ((entry.labelsAdded?.length || entry.labelsRemoved?.length) && !caps.setLabels) {
    throw new Error('Permission denied: login required to modify labels');
  }

  const inst = instruments.find(i => i.id === instrumentId);
  if (!inst) throw new Error(`Instrument not found: ${instrumentId}`);

  const terminal = inst.status === 'retired' || inst.status === 'disposed';

  // Determine effective status change
  const effectiveStatus = (!terminal && entry.status && entry.status !== inst.status)
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

  // Resolve contributor — use session user for guests, or the provided contributor_id
  const contributorId = entry.contributor_id
    || (session?.user?.id)
    || 'c7'; // fallback to Visitor

  const logEntry = {
    id: 'l' + Date.now(),
    type: entry.type,
    date: entry.date || new Date().toISOString().split('T')[0],
    contributor_id: contributorId,
    notes: entry.notes,
    status: effectiveStatus,
    score: effectiveScore,
    labels_added: labelsAdded,
    labels_removed: labelsRemoved,
    attachments: entry.attachments || [],
  };

  inst.log.push(logEntry);
  persist();

  return { instrument: inst, logEntry };
}
