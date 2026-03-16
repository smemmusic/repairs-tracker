import { INFERENCE_RULES, STATUS_SUGGESTIONS } from './config.js';
import { LabelAction } from './constants.js';

/**
 * Generic rule engine that applies inference rules from the backend config.
 * Rules are fetched once via loadConfig() and applied here.
 */

/**
 * Suggests a status change based on entry type and current status.
 * Returns the suggested status string, or null if no change suggested.
 */
export function inferStatusSuggestion(entryType, currentStatus) {
  for (const rule of STATUS_SUGGESTIONS) {
    if (rule.entryType === entryType && rule.currentStatus === currentStatus) {
      return rule.suggestedStatus;
    }
  }
  return null;
}

/**
 * Suggests label additions/removals based on entry type, effective status,
 * and currently active labels.
 *
 * Returns an object mapping label keys to LabelAction.ADD or LabelAction.REMOVE.
 */
export function inferLabelSuggestions(entryType, effectiveStatus, currentLabels) {
  const suggestions = {};
  const has = new Set(currentLabels);

  for (const rule of INFERENCE_RULES) {
    if (rule.entryType !== null && rule.entryType !== entryType) continue;
    if (rule.status !== null && rule.status !== effectiveStatus) continue;

    if (rule.action === LabelAction.ADD && !has.has(rule.label)) {
      suggestions[rule.label] = LabelAction.ADD;
    } else if (rule.action === LabelAction.REMOVE && has.has(rule.label)) {
      suggestions[rule.label] = LabelAction.REMOVE;
    }
  }

  return suggestions;
}
