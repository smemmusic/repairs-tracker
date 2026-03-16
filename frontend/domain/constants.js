// ── Client-only constants ────────────────────────────────────────────
// Values that don't come from the backend and are only used by the frontend UI.

export const APP_NAME = 'SMEM';
export const DEMO_PASSWORD = 'smem';
export const DASHBOARD_NOTE_TRUNCATE = 100;

export const LabelAction = Object.freeze({
  ADD:    'add',
  REMOVE: 'remove',
  CANCEL: 'cancel',   // client-only: used to undo a pending suggestion
});

export const Filter = Object.freeze({
  ALL:           'all',
  DISPLAY_READY: 'display_ready',
});

/**
 * Split a pendingLabels map into { added, removed } arrays.
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
