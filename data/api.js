import { instruments as seedData } from './seed.js';
import { getScore, isDisplayReady } from '../domain/computed.js';

// In-memory store — will be replaced by fetch() calls to FastAPI
const instruments = structuredClone(seedData);

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
 */
export async function getInstrument(id) {
  return instruments.find(i => i.id === id) || null;
}

/**
 * Add a log entry to an instrument. Applies status and label changes.
 * Returns { instrument, logEntry }.
 */
export async function addLogEntry(instrumentId, entry) {
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

  const logEntry = {
    id: 'l' + Date.now(),
    type: entry.type,
    date: entry.date || new Date().toISOString().split('T')[0],
    author: entry.author || 'You',
    notes: entry.notes,
    status: effectiveStatus,
    score: effectiveScore,
    labels_added: labelsAdded,
    labels_removed: labelsRemoved,
    attachments: entry.attachments || [],
  };

  inst.log.push(logEntry);

  return { instrument: inst, logEntry };
}
