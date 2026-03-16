export const APP_NAME = 'SMEM';

export const DISPLAY_READY_THRESHOLD = 7;

// Dashboard
export const DASHBOARD_FEED_LIMIT = 10;
export const DASHBOARD_NOTE_TRUNCATE = 100;

// Demo credentials — all seeded users share this password. Replaced by Drupal OAuth in production.
export const DEMO_PASSWORD = 'smem';

// localStorage keys — used to persist state between page reloads. Replaced by database + session in production.
export const STORAGE_KEY_INSTRUMENTS = 'smem_instruments';
export const STORAGE_KEY_SESSION = 'smem_session';

// ── Enums ────────────────────────────────────────────────────────────

export const Status = Object.freeze({
  UNKNOWN:  'unknown',
  BROKEN:   'broken',
  WORKING:  'working',
  RETIRED:  'retired',
  DISPOSED: 'disposed',
});

export const EntryType = Object.freeze({
  ASSESSMENT:   'assessment',
  REPAIR:       'repair',
  CLEANING:     'cleaning',
  FAULT_REPORT: 'fault_report',
  OTHER:        'other',
});

export const Label = Object.freeze({
  NEEDS_REPAIR:        'needs_repair',
  NEEDS_INVESTIGATION: 'needs_investigation',
  NEEDS_CLEANING:      'needs_cleaning',
  NEEDS_PARTS:         'needs_parts',
});

export const LabelAction = Object.freeze({
  ADD:    'add',
  REMOVE: 'remove',
  CANCEL: 'cancel',
});

export const Filter = Object.freeze({
  ALL:           'all',
  DISPLAY_READY: 'display_ready',
  ...Status,
});


// ── Metadata ─────────────────────────────────────────────────────────

export const ENTRY_TYPES = [
  { key: EntryType.FAULT_REPORT, label: 'Fault report' },
  { key: EntryType.ASSESSMENT,   label: 'Assessment' },
  { key: EntryType.REPAIR,       label: 'Repair' },
  { key: EntryType.CLEANING,     label: 'Cleaning' },
  { key: EntryType.OTHER,        label: 'Other' },
];

export const STATUSES = [
  { key: Status.UNKNOWN,  label: 'Unknown',  desc: 'Condition not yet assessed' },
  { key: Status.BROKEN,   label: 'Broken',   desc: 'Known functional issues' },
  { key: Status.WORKING,  label: 'Working',  desc: 'Functioning correctly' },
  { key: Status.RETIRED,  label: 'Retired',  desc: 'Kept in storage, not for display' },
  { key: Status.DISPOSED, label: 'Disposed', desc: 'No longer in possession' },
];

export const LABELS = [
  { key: Label.NEEDS_REPAIR,        label: 'Needs repair',        cls: 'label-needs_repair' },
  { key: Label.NEEDS_INVESTIGATION, label: 'Needs investigation', cls: 'label-needs_investigation' },
  { key: Label.NEEDS_CLEANING,      label: 'Needs cleaning',      cls: 'label-needs_cleaning' },
  { key: Label.NEEDS_PARTS,         label: 'Needs parts',         cls: 'label-needs_parts' },
];

export function getLabelDef(key) {
  return LABELS.find(l => l.key === key);
}

/**
 * Split a pendingLabels map into { added, removed } arrays.
 * @param {Object.<string, LabelAction>} labelMap
 * @returns {{ added: string[], removed: string[] }}
 */
export function partitionLabelActions(labelMap) {
  const added = [];
  const removed = [];
  for (const [key, action] of Object.entries(labelMap)) {
    if (action === LabelAction.ADD) added.push(key);
    else if (action === LabelAction.REMOVE) removed.push(key);
  }
  return { added, removed };
}
