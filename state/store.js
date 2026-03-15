const state = {
  session: null,       // { user, capabilities } from auth
  selectedId: null,
  activeFilter: 'all',
  pendingLabels: {},   // map of label key → 'add' | 'remove'
  stagedFiles: [],     // array of { name, type, url }
  drafts: {},          // map of instrument id → draft object
  editingEntryId: null, // log entry ID being edited, or null
};

export function get(key) {
  return state[key];
}

export function set(key, value) {
  state[key] = value;
}

/**
 * Save the current form state as a draft for the given instrument.
 * Only saves if there's something worth keeping (type, notes, or files).
 */
export function saveDraft(id, formValues) {
  if (!id) return;
  if (!formValues.type && !formValues.notes && !state.stagedFiles.length) {
    delete state.drafts[id];
    return;
  }
  state.drafts[id] = {
    ...formValues,
    pendingLabels: { ...state.pendingLabels },
    stagedFiles: [...state.stagedFiles],
  };
}

/**
 * Returns the saved draft for an instrument, or null.
 */
export function getDraft(id) {
  return state.drafts[id] || null;
}

/**
 * Clear the draft for an instrument.
 */
export function clearDraft(id) {
  delete state.drafts[id];
}
