export const instruments = [
  {
    id: 'i1', airtable_id: 'AT-0042', display_name: 'Moog Minimoog Model D', serial_number: '12847',
    status: 'broken', labels: ['needs_repair'],
    log: [
      { id: 'l1', type: 'assessment', date: '2026-02-18', author: 'Petra K.', notes: 'Keyboard plays. All three oscillators audible but unstable above C4. Filter functioning. Keybed contacts dirty.', status: 'broken', score: 4, labels_added: ['needs_repair'], labels_removed: [] },
      { id: 'l2', type: 'cleaning',   date: '2026-02-25', author: 'Luc R.',   notes: 'Full keybed contact clean using Deoxit. Keys now registering correctly. Pitch and mod wheels freed up.', status: null, score: null, labels_added: [], labels_removed: [] },
      { id: 'l3', type: 'repair',     date: '2026-03-05', author: 'Jean-Marc B.', notes: 'Replaced C14 and C18 on VCO board. Oscillator 1 tracking correctly. Oscillator 2 still drifts — trimmer calibration needed.', status: null, score: 6, labels_added: [], labels_removed: [] },
      { id: 'l4', type: 'repair',     date: '2026-03-12', author: 'Jean-Marc B.', notes: 'Recalibrated OSC 2 trimmer R47. All three oscillators tracking within ±2 cents. Filter self-oscillation confirmed.', status: null, score: 8, labels_added: [], labels_removed: [] },
    ]
  },
  {
    id: 'i2', airtable_id: 'AT-0017', display_name: 'Roland Juno-106', serial_number: '643291',
    status: 'working', labels: [],
    log: [
      { id: 'l5', type: 'assessment', date: '2026-01-10', author: 'Petra K.', notes: 'Voices 3 and 5 dead — 80017A chip failure. Four voices functional. Chorus working.', status: 'broken', score: 5, labels_added: ['needs_repair'], labels_removed: [] },
      { id: 'l6', type: 'repair',     date: '2026-02-01', author: 'Jean-Marc B.', notes: 'Replaced 80017A chips on voices 3 and 5. All six voices now producing audio.', status: null, score: 7, labels_added: [], labels_removed: [] },
      { id: 'l7', type: 'assessment', date: '2026-02-14', author: 'Petra K.', notes: 'All six voices consistent. Chorus both modes functional. Approved for display.', status: 'working', score: 9, labels_added: [], labels_removed: ['needs_repair'] },
    ]
  },
  {
    id: 'i3', airtable_id: 'AT-0008', display_name: 'ARP 2600', serial_number: null,
    status: 'broken', labels: ['needs_repair'],
    log: [
      { id: 'l8', type: 'assessment', date: '2025-11-20', author: 'Petra K.', notes: 'Significant corrosion on PSU board. VCO 1 non-functional. VCF intact. No serial number visible.', status: 'broken', score: 2, labels_added: ['needs_repair'], labels_removed: [] },
    ]
  },
  {
    id: 'i4', airtable_id: 'AT-0031', display_name: 'Oberheim OB-Xa', serial_number: 'OB2-1042',
    status: 'broken', labels: ['needs_repair', 'needs_investigation'],
    log: [
      { id: 'l9',  type: 'assessment',   date: '2026-01-28', author: 'Jean-Marc B.', notes: 'Eight-voice unit. Voices 1, 2, 7 producing audio. Five others silent. Panel switches intermittent.', status: 'broken', score: 3, labels_added: ['needs_repair'], labels_removed: [] },
      { id: 'l10', type: 'fault_report', date: '2026-02-15', author: 'Luc R.',       notes: 'Pitch wheel not returning to centre. Several panel LEDs not illuminating.', status: null, score: null, labels_added: ['needs_investigation'], labels_removed: [] },
    ]
  },
  {
    id: 'i5', airtable_id: 'AT-0055', display_name: 'Korg MS-20 (early)', serial_number: '100423',
    status: 'working', labels: [],
    log: [
      { id: 'l11', type: 'assessment', date: '2025-09-10', author: 'Petra K.', notes: 'Both oscillators stable. Filter working and self-oscillating. All patch points functional.', status: 'working', score: 8, labels_added: [], labels_removed: [] },
      { id: 'l12', type: 'cleaning',   date: '2025-10-02', author: 'Luc R.',   notes: 'Panel cleaned. Knob caps stabilised. Patch bay contacts cleaned.', status: null, score: 9, labels_added: [], labels_removed: [] },
    ]
  },
  {
    id: 'i6', airtable_id: 'AT-0061', display_name: 'Sequential Prophet-5', serial_number: '1823',
    status: 'broken', labels: ['needs_repair', 'needs_investigation'],
    log: [
      { id: 'l13', type: 'assessment',   date: '2026-01-05', author: 'Petra K.',     notes: 'Voices 2 and 4 intermittent. Patch memory intact. Needs voice card inspection.', status: 'broken', score: 5, labels_added: ['needs_repair'], labels_removed: [] },
      { id: 'l14', type: 'repair',       date: '2026-01-20', author: 'Jean-Marc B.', notes: 'Reseated voice card connectors. Voice 4 stable. Voice 2 still dropping — CEM3340 suspected. Replacement ordered.', status: null, score: 6, labels_added: [], labels_removed: [] },
      { id: 'l15', type: 'fault_report', date: '2026-02-10', author: 'Luc R.',       notes: 'Pitch wheel not returning to centre. Spring feels weak.', status: null, score: null, labels_added: ['needs_investigation'], labels_removed: [] },
    ]
  },
  {
    id: 'i7', airtable_id: 'AT-0023', display_name: 'Yamaha CS-80', serial_number: '3041',
    status: 'broken', labels: ['needs_repair'],
    log: [
      { id: 'l16', type: 'assessment', date: '2025-12-01', author: 'Petra K.',     notes: 'Several keys not sounding. Ribbon unresponsive. PSU slightly low on +15V.', status: 'broken', score: 4, labels_added: ['needs_repair'], labels_removed: [] },
      { id: 'l17', type: 'repair',     date: '2026-01-10', author: 'Jean-Marc B.', notes: 'Recapped PSU. Eight keys restored. Ribbon replaced and working.', status: null, score: 7, labels_added: [], labels_removed: [] },
      { id: 'l18', type: 'assessment', date: '2026-02-20', author: 'Petra K.',     notes: 'Mostly functional but persistent tuning drift on upper octave — temperature dependent. Not yet suitable for display.', status: null, score: 7, labels_added: [], labels_removed: [] },
    ]
  },
  {
    id: 'i8', airtable_id: 'AT-0014', display_name: 'EMS Synthi AKS', serial_number: 'AKS-0291',
    status: 'unknown', labels: ['needs_investigation'],
    log: [
      { id: 'l19', type: 'assessment',   date: '2025-09-10', author: 'Petra K.',     notes: 'Pin matrix intact. Oscillators drifting. Full calibration required.', status: 'broken', score: 6, labels_added: ['needs_repair'], labels_removed: [] },
      { id: 'l20', type: 'repair',       date: '2025-10-01', author: 'Jean-Marc B.', notes: 'Full calibration completed. All oscillators and noise source confirmed working.', status: 'working', score: 9, labels_added: [], labels_removed: ['needs_repair'] },
      { id: 'l21', type: 'fault_report', date: '2026-03-10', author: 'Luc R.',       notes: 'Pin matrix joystick sticky, not springing back. Noticed during visitor demo.', status: 'unknown', score: null, labels_added: ['needs_investigation'], labels_removed: [] },
    ]
  },
  {
    id: 'i9', airtable_id: 'AT-0039', display_name: 'Roland TB-303', serial_number: '351822',
    status: 'working', labels: [],
    log: [
      { id: 'l22', type: 'assessment', date: '2024-06-01', author: 'Petra K.', notes: 'All functions working. Accents and slides correct. Minor cosmetic wear only.', status: 'working', score: 9, labels_added: [], labels_removed: [] },
    ]
  },
  {
    id: 'i10', airtable_id: 'AT-0077', display_name: 'Buchla 200 System', serial_number: null,
    status: 'unknown', labels: [],
    log: []
  },
  {
    id: 'i11', airtable_id: 'AT-0088', display_name: 'Korg Poly-61', serial_number: '290441',
    status: 'retired', labels: [],
    log: [
      { id: 'l23', type: 'assessment', date: '2024-03-10', author: 'Jean-Marc B.', notes: 'Beyond economic repair. Multiple failed voice chips, corroded PCBs. Retained for donor parts.', status: 'retired', score: 1, labels_added: [], labels_removed: [] },
    ]
  },
  {
    id: 'i12', airtable_id: 'AT-0091', display_name: 'Roland Juno-60', serial_number: '447823',
    status: 'disposed', labels: [],
    log: [
      { id: 'l24', type: 'assessment', date: '2024-01-15', author: 'Petra K.', notes: 'Duplicate unit. Sold to fund acquisition of ARP 2600.', status: 'disposed', score: null, labels_added: [], labels_removed: [] },
    ]
  },
  {
    id: 'i13', airtable_id: 'AT-0052', display_name: 'Korg MS-20 (late)', serial_number: '309871',
    status: 'working', labels: ['needs_cleaning'],
    log: [
      { id: 'l25', type: 'assessment', date: '2026-02-01', author: 'Petra K.', notes: 'Fully functional. Both oscillators stable. Panel and knobs heavily soiled from previous owner.', status: 'working', score: 7, labels_added: ['needs_cleaning'], labels_removed: [] },
    ]
  },
];
