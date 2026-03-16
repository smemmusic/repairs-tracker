import { request, endpoints } from '../data/client.js';

// ── Backend config cache ─────────────────────────────────────────────
// Populated by loadConfig() on app boot. All values come from GET /api/config.

export let STATUSES = [];
export let ENTRY_TYPES = [];
export let LABELS = [];
export let DISPLAY_READY_THRESHOLD = 7;
export let INFERENCE_RULES = [];
export let STATUS_SUGGESTIONS = [];

export let Status = {};
export let EntryType = {};

export function getLabelDef(key) {
  return LABELS.find(l => l.key === key);
}

/**
 * Returns display-ready check results for given projected state.
 */
export function getDisplayReadyChecks(status, labels, score) {
  return [
    { label: 'Status: working', pass: status === 'working' },
    { label: 'No active labels', pass: labels.length === 0 },
    { label: `Score \u2265 ${DISPLAY_READY_THRESHOLD}`, pass: score !== null && score >= DISPLAY_READY_THRESHOLD },
  ];
}

export async function loadConfig() {
  const config = await request('GET', endpoints.config());

  STATUSES = config.statuses;
  ENTRY_TYPES = config.entryTypes;
  LABELS = config.labels;
  DISPLAY_READY_THRESHOLD = config.displayReadyThreshold;
  INFERENCE_RULES = config.inferenceRules;
  STATUS_SUGGESTIONS = config.statusSuggestions;

  Status = Object.freeze(
    Object.fromEntries(config.statuses.map(s => [s.key.toUpperCase(), s.key]))
  );
  EntryType = Object.freeze(
    Object.fromEntries(config.entryTypes.map(t => [t.key.toUpperCase(), t.key]))
  );
}
