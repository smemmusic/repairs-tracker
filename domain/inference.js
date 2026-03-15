import { Status, EntryType, Label, LabelAction } from './constants.js';

/**
 * Suggests a status change based on entry type and current status.
 * Returns the suggested status string, or null if no change suggested.
 *
 * Single rule: a fault_report on a working instrument suggests unknown.
 */
export function inferStatusSuggestion(entryType, currentStatus) {
  if (entryType === EntryType.FAULT_REPORT && currentStatus === Status.WORKING) {
    return Status.UNKNOWN;
  }
  return null;
}

/**
 * Suggests label additions/removals based on entry type, effective status,
 * and currently active labels.
 *
 * Returns an object mapping label keys to LabelAction.ADD or LabelAction.REMOVE.
 * e.g. { needs_repair: 'add', needs_investigation: 'add' }
 */
export function inferLabelSuggestions(entryType, effectiveStatus, currentLabels) {
  const suggestions = {};

  // Global rule: broken status always implies needs_repair
  if (effectiveStatus === Status.BROKEN && !currentLabels.includes(Label.NEEDS_REPAIR)) {
    suggestions[Label.NEEDS_REPAIR] = LabelAction.ADD;
  }

  if (entryType === EntryType.FAULT_REPORT) {
    if (!currentLabels.includes(Label.NEEDS_INVESTIGATION)) {
      suggestions[Label.NEEDS_INVESTIGATION] = LabelAction.ADD;
    }
  }

  if (entryType === EntryType.ASSESSMENT) {
    if (effectiveStatus === Status.WORKING && currentLabels.includes(Label.NEEDS_REPAIR)) {
      suggestions[Label.NEEDS_REPAIR] = LabelAction.REMOVE;
    }
  }

  if (entryType === EntryType.REPAIR) {
    if (effectiveStatus === Status.WORKING) {
      if (currentLabels.includes(Label.NEEDS_REPAIR)) {
        suggestions[Label.NEEDS_REPAIR] = LabelAction.REMOVE;
      }
      if (currentLabels.includes(Label.NEEDS_INVESTIGATION)) {
        suggestions[Label.NEEDS_INVESTIGATION] = LabelAction.REMOVE;
      }
    }
  }

  if (entryType === EntryType.CLEANING) {
    if (currentLabels.includes(Label.NEEDS_CLEANING)) {
      suggestions[Label.NEEDS_CLEANING] = LabelAction.REMOVE;
    }
  }

  return suggestions;
}
