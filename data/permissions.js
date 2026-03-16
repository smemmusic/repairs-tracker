import { inferStatusSuggestion, inferLabelSuggestions } from '../domain/inference.js';
import { EntryType, partitionLabelActions } from '../domain/constants.js';

/**
 * Check capabilities for adding a log entry. Throws on denied.
 */
export function authorizeAddEntry(entry, caps) {
  const isFaultReport = entry.type === EntryType.FAULT_REPORT;
  if (isFaultReport && !caps.submitFaultReport) {
    throw new Error('Permission denied: cannot submit fault reports');
  }
  if (!isFaultReport && !caps.submitOtherEntryTypes) {
    throw new Error('Permission denied: login required for this entry type');
  }
  if (entry.status && !caps.setStatus && !isFaultReport) {
    throw new Error('Permission denied: login required to set status');
  }
  if ((entry.labelsAdded?.length || entry.labelsRemoved?.length) && !caps.setLabels && !isFaultReport) {
    throw new Error('Permission denied: login required to modify labels');
  }
}

/**
 * For guest fault reports, override client-sent status/labels with server-inferred values.
 * Mutates `entry` in place.
 */
export function enforceGuestOverrides(entry, inst, caps) {
  const isFaultReport = entry.type === EntryType.FAULT_REPORT;
  if (!isFaultReport || (caps.setStatus && caps.setLabels)) return;

  const suggestedStatus = inferStatusSuggestion(EntryType.FAULT_REPORT, inst.status);
  const suggestedLabels = inferLabelSuggestions(EntryType.FAULT_REPORT, suggestedStatus || inst.status, inst.labels);

  if (!caps.setStatus) {
    entry.status = suggestedStatus;
  }
  if (!caps.setLabels) {
    const { added, removed } = partitionLabelActions(suggestedLabels);
    entry.labelsAdded = added;
    entry.labelsRemoved = removed;
  }
}

/**
 * Check capabilities for editing a log entry. Throws on denied.
 */
export function authorizeEditEntry(caps) {
  if (!caps.editLogEntry) {
    throw new Error('Permission denied: login required to edit log entries');
  }
}

/**
 * Check capabilities for deleting a log entry. Throws on denied.
 */
export function authorizeDeleteEntry(caps) {
  if (!caps.deleteLogEntry) {
    throw new Error('Permission denied: login required to delete log entries');
  }
}

/**
 * Return a permission-filtered view of an instrument.
 * Strips log history for users without viewLogHistory capability.
 */
export function filterInstrumentView(inst, caps) {
  if (!caps.viewLogHistory) {
    return { ...inst, log: [] };
  }
  return inst;
}
