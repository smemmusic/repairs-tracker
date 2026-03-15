export const DISPLAY_READY_THRESHOLD = 7;

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
