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
 * Each rule: when entryType + effectiveStatus match, suggest an action for a label.
 * A null entryType means the rule applies regardless of entry type.
 */
const LABEL_RULES = [
  { entryType: null,                    status: Status.BROKEN,  label: Label.NEEDS_REPAIR,        action: LabelAction.ADD },
  { entryType: EntryType.FAULT_REPORT,  status: null,           label: Label.NEEDS_INVESTIGATION, action: LabelAction.ADD },
  { entryType: EntryType.ASSESSMENT,    status: Status.WORKING, label: Label.NEEDS_REPAIR,        action: LabelAction.REMOVE },
  { entryType: EntryType.REPAIR,        status: Status.WORKING, label: Label.NEEDS_REPAIR,        action: LabelAction.REMOVE },
  { entryType: EntryType.REPAIR,        status: Status.WORKING, label: Label.NEEDS_INVESTIGATION, action: LabelAction.REMOVE },
  { entryType: EntryType.REPAIR,        status: Status.WORKING, label: Label.NEEDS_PARTS,         action: LabelAction.REMOVE },
  { entryType: EntryType.CLEANING,      status: null,           label: Label.NEEDS_CLEANING,      action: LabelAction.REMOVE },
];

/**
 * Suggests label additions/removals based on entry type, effective status,
 * and currently active labels.
 *
 * Returns an object mapping label keys to LabelAction.ADD or LabelAction.REMOVE.
 */
export function inferLabelSuggestions(entryType, effectiveStatus, currentLabels) {
  const suggestions = {};
  const has = (l) => currentLabels.includes(l);

  for (const rule of LABEL_RULES) {
    if (rule.entryType && rule.entryType !== entryType) continue;
    if (rule.status && rule.status !== effectiveStatus) continue;

    const shouldSuggest = rule.action === LabelAction.ADD ? !has(rule.label) : has(rule.label);
    if (shouldSuggest) {
      suggestions[rule.label] = rule.action;
    }
  }

  return suggestions;
}
