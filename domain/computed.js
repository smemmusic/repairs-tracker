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
