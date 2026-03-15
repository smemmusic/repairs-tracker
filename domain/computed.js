import { DISPLAY_READY_THRESHOLD } from './constants.js';

/**
 * Returns the most recent condition score from an instrument's log, or null.
 */
export function getScore(instrument) {
  const scored = instrument.log.filter(e => e.score !== null);
  return scored.length ? scored[scored.length - 1].score : null;
}

/**
 * Returns whether an instrument meets all display readiness criteria.
 */
export function isDisplayReady(instrument) {
  const score = getScore(instrument);
  return (
    instrument.status === 'working'
    && instrument.labels.length === 0
    && score !== null
    && score >= DISPLAY_READY_THRESHOLD
  );
}

/**
 * Returns the current location from an instrument's log, or null.
 */
export function getLocation(instrument) {
  for (let i = instrument.log.length - 1; i >= 0; i--) {
    if (instrument.log[i].location) return instrument.log[i].location;
  }
  return null;
}

/**
 * Returns the display-ready checks for given state.
 * Each check has { label, pass }.
 */
export function getDisplayReadyChecks(status, labels, score) {
  return [
    { label: 'Status: working', pass: status === 'working' },
    { label: 'No active labels', pass: labels.length === 0 },
    { label: `Score \u2265 ${DISPLAY_READY_THRESHOLD}`, pass: score !== null && score >= DISPLAY_READY_THRESHOLD },
  ];
}

