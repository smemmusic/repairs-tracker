export const DISPLAY_READY_THRESHOLD = 7;

// Demo credentials — all seeded users share this password. Replaced by Drupal OAuth in production.
export const DEMO_PASSWORD = 'smem';

// localStorage keys — used to persist state between page reloads. Replaced by database + session in production.
export const STORAGE_KEY_INSTRUMENTS = 'smem_instruments';
export const STORAGE_KEY_SESSION = 'smem_session';

export const STATUSES = [
  { key: 'unknown',  label: 'Unknown',  desc: 'Condition not yet assessed' },
  { key: 'broken',   label: 'Broken',   desc: 'Known functional issues' },
  { key: 'working',  label: 'Working',  desc: 'Functioning correctly' },
  { key: 'retired',  label: 'Retired',  desc: 'Kept in storage, not for display' },
  { key: 'disposed', label: 'Disposed', desc: 'No longer in possession' },
];

export const LABELS = [
  { key: 'needs_repair',        label: 'Needs repair',        cls: 'label-needs_repair' },
  { key: 'needs_investigation', label: 'Needs investigation', cls: 'label-needs_investigation' },
  { key: 'needs_cleaning',      label: 'Needs cleaning',      cls: 'label-needs_cleaning' },
];

export function getLabelDef(key) {
  return LABELS.find(l => l.key === key);
}
