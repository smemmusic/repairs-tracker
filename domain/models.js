import { Status, EntryType, LabelAction } from './constants.js';

/**
 * @typedef {Object} Attachment
 * @property {string} name - filename
 * @property {string} type - MIME type
 * @property {string} url  - blob URL or file URL
 */

/**
 * @typedef {Object} LogEntry
 * @property {string}       id              - unique ID (e.g. 'l' + timestamp)
 * @property {EntryType}    type            - entry type
 * @property {string}       date            - ISO date string (YYYY-MM-DD)
 * @property {string|null}  contributor_id  - contributor ID, or null for visitors
 * @property {string}       notes           - free-form notes
 * @property {Status|null}  status          - new status if changed, else null
 * @property {number|null}  score           - condition score 1–10, or null
 * @property {string|null}  location        - storage location, or null
 * @property {string[]}     labels_added    - label keys added by this entry
 * @property {string[]}     labels_removed  - label keys removed by this entry
 * @property {Attachment[]} attachments     - attached files
 */

/**
 * @typedef {Object} Instrument
 * @property {string}     id            - unique ID (e.g. 'i1')
 * @property {string}     airtable_id   - external reference (e.g. 'AT-0042')
 * @property {string}     display_name  - human-readable name
 * @property {string|null} serial_number - serial number or null
 * @property {Status}     status        - current status
 * @property {string[]}   labels        - active label keys
 * @property {LogEntry[]} log           - chronological log entries
 */

/**
 * @typedef {Object} Contributor
 * @property {string}      id             - unique ID (e.g. 'c1')
 * @property {string}      name           - display name
 * @property {string|null} drupal_user_id - Drupal login ID
 */

/**
 * @typedef {Object} Capabilities
 * @property {boolean} viewLogHistory
 * @property {boolean} viewScores
 * @property {boolean} submitFaultReport
 * @property {boolean} submitOtherEntryTypes
 * @property {boolean} setStatus
 * @property {boolean} setLabels
 * @property {boolean} editLogEntry
 * @property {boolean} deleteLogEntry
 */

/**
 * @typedef {Object} Session
 * @property {{ id: string, name: string }|null} user
 * @property {Capabilities} capabilities
 */

/**
 * @typedef {Object} Draft
 * @property {string}  type
 * @property {string}  status
 * @property {string}  score
 * @property {string}  date
 * @property {string}  location
 * @property {string}  notes
 * @property {boolean} formOpen
 * @property {Object.<string, LabelAction>} pendingLabels
 * @property {Attachment[]} stagedFiles
 */

// ── Factory functions ────────────────────────────────────────────────

/** @returns {LogEntry} */
export function createLogEntry(overrides = {}) {
  return {
    id: 'l' + Date.now(),
    type: EntryType.ASSESSMENT,
    date: new Date().toISOString().split('T')[0],
    contributor_id: null,
    notes: '',
    status: null,
    score: null,
    location: null,
    labels_added: [],
    labels_removed: [],
    attachments: [],
    ...overrides,
  };
}

/** @returns {Instrument} */
export function createInstrument(overrides = {}) {
  return {
    id: '',
    airtable_id: '',
    display_name: '',
    serial_number: null,
    status: Status.UNKNOWN,
    labels: [],
    log: [],
    ...overrides,
  };
}

/** @returns {Session} */
export function createSession(user = null, capabilities = {}) {
  return { user, capabilities };
}

/** @returns {Capabilities} */
export function createCapabilities(overrides = {}) {
  return {
    viewLogHistory: false,
    viewScores: false,
    submitFaultReport: false,
    submitOtherEntryTypes: false,
    setStatus: false,
    setLabels: false,
    editLogEntry: false,
    deleteLogEntry: false,
    ...overrides,
  };
}

/** @returns {Draft} */
export function createDraft(overrides = {}) {
  return {
    type: '',
    status: '',
    score: '',
    date: '',
    location: '',
    notes: '',
    formOpen: false,
    pendingLabels: {},
    stagedFiles: [],
    ...overrides,
  };
}

/** @returns {Attachment} */
export function createAttachment(overrides = {}) {
  return {
    name: '',
    type: '',
    url: '',
    ...overrides,
  };
}
