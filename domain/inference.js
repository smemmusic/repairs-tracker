/**
 * Suggests a status change based on entry type and current status.
 * Returns the suggested status string, or null if no change suggested.
 *
 * Single rule: a fault_report on a working instrument suggests unknown.
 */
export function inferStatusSuggestion(entryType, currentStatus) {
  if (entryType === 'fault_report' && currentStatus === 'working') {
    return 'unknown';
  }
  return null;
}

/**
 * Suggests label additions/removals based on entry type, effective status,
 * and currently active labels.
 *
 * Returns an object mapping label keys to 'add' or 'remove'.
 * e.g. { needs_repair: 'add', needs_investigation: 'add' }
 */
export function inferLabelSuggestions(entryType, effectiveStatus, currentLabels) {
  const suggestions = {};

  // Global rule: broken status always implies needs_repair
  if (effectiveStatus === 'broken' && !currentLabels.includes('needs_repair')) {
    suggestions['needs_repair'] = 'add';
  }

  if (entryType === 'fault_report') {
    if (!currentLabels.includes('needs_investigation')) {
      suggestions['needs_investigation'] = 'add';
    }
  }

  if (entryType === 'assessment') {
    if (effectiveStatus === 'working' && currentLabels.includes('needs_repair')) {
      suggestions['needs_repair'] = 'remove';
    }
  }

  if (entryType === 'repair') {
    if (effectiveStatus === 'working') {
      if (currentLabels.includes('needs_repair')) {
        suggestions['needs_repair'] = 'remove';
      }
      if (currentLabels.includes('needs_investigation')) {
        suggestions['needs_investigation'] = 'remove';
      }
    }
  }

  if (entryType === 'cleaning') {
    if (currentLabels.includes('needs_cleaning')) {
      suggestions['needs_cleaning'] = 'remove';
    }
  }

  return suggestions;
}
