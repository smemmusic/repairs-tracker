"""
Seed the database with demo data. Run with: uv run python seed.py
"""

from datetime import date

from sqlmodel import Session

from database import engine, create_db
from models import Contributor, Instrument, LogEntry
from enums import InstrumentStatus as S, EntryType as E, LabelKey as L


CONTRIBUTORS = [
    Contributor(id="c1", name="Charlie", drupal_user_id="charlie"),
    Contributor(id="c2", name="Flavia", drupal_user_id="flavia"),
    Contributor(id="c3", name="Adrien", drupal_user_id="adrien"),
    Contributor(id="c4", name="Chris", drupal_user_id="chris"),
    Contributor(id="c5", name="Victorien", drupal_user_id="victorien"),
    Contributor(id="c6", name="Laurent", drupal_user_id="laurent"),
]


def _entry(
    id,
    instrument_id,
    type,
    performed_at,
    contributor_id,
    notes,
    status=None,
    score=None,
    location=None,
    labels_added=None,
    labels_removed=None,
):
    return LogEntry(
        id=id,
        instrument_id=instrument_id,
        entry_type=type,
        performed_at=date.fromisoformat(performed_at),
        contributor_id=contributor_id,
        notes=notes,
        status=status,
        condition_score=score,
        location=location,
        labels_added=labels_added or [],
        labels_removed=labels_removed or [],
    )


INSTRUMENTS = [
    Instrument(
        id="i1",
        airtable_id="AT-0042",
        display_name="Moog Minimoog Model D",
        serial_number="12847",
    ),
    Instrument(
        id="i2",
        airtable_id="AT-0017",
        display_name="Roland Juno-106",
        serial_number="643291",
    ),
    Instrument(
        id="i3", airtable_id="AT-0008", display_name="ARP 2600", serial_number=None
    ),
    Instrument(
        id="i4",
        airtable_id="AT-0031",
        display_name="Oberheim OB-Xa",
        serial_number="OB2-1042",
    ),
    Instrument(
        id="i5",
        airtable_id="AT-0055",
        display_name="Korg MS-20 (early)",
        serial_number="100423",
    ),
    Instrument(
        id="i6",
        airtable_id="AT-0061",
        display_name="Sequential Prophet-5",
        serial_number="1823",
    ),
    Instrument(
        id="i7",
        airtable_id="AT-0023",
        display_name="Yamaha CS-80",
        serial_number="3041",
    ),
    Instrument(
        id="i8",
        airtable_id="AT-0014",
        display_name="EMS Synthi AKS",
        serial_number="AKS-0291",
    ),
    Instrument(
        id="i9",
        airtable_id="AT-0039",
        display_name="Roland TB-303",
        serial_number="351822",
    ),
    Instrument(
        id="i10",
        airtable_id="AT-0077",
        display_name="Buchla 200 System",
        serial_number=None,
    ),
    Instrument(
        id="i11",
        airtable_id="AT-0088",
        display_name="Korg Poly-61",
        serial_number="290441",
    ),
    Instrument(
        id="i12",
        airtable_id="AT-0091",
        display_name="Roland Juno-60",
        serial_number="447823",
    ),
    Instrument(
        id="i13",
        airtable_id="AT-0052",
        display_name="Korg MS-20 (late)",
        serial_number="309871",
    ),
]

LOG_ENTRIES = [
    # i1 — Moog Minimoog Model D
    _entry(
        "l1",
        "i1",
        E.ASSESSMENT,
        "2026-02-18",
        "c1",
        "Keyboard plays. All three oscillators audible but unstable above C4. Filter functioning. Keybed contacts dirty.",
        status=S.BROKEN,
        score=4,
        labels_added=[L.NEEDS_REPAIR],
        location="Workshop",
    ),
    _entry(
        "l2",
        "i1",
        E.CLEANING,
        "2026-02-25",
        "c6",
        "Full keybed contact clean using Deoxit. Keys now registering correctly. Pitch and mod wheels freed up.",
    ),
    _entry(
        "l3",
        "i1",
        E.REPAIR,
        "2026-03-05",
        "c3",
        "Replaced C14 and C18 on VCO board. Oscillator 1 tracking correctly. Oscillator 2 still drifts — trimmer calibration needed.",
        score=6,
    ),
    _entry(
        "l4",
        "i1",
        E.REPAIR,
        "2026-03-12",
        "c3",
        "Recalibrated OSC 2 trimmer R47. All three oscillators tracking within ±2 cents. Filter self-oscillation confirmed.",
        score=8,
    ),
    # i2 — Roland Juno-106
    _entry(
        "l5",
        "i2",
        E.ASSESSMENT,
        "2026-01-10",
        "c1",
        "Voices 3 and 5 dead — 80017A chip failure. Four voices functional. Chorus working.",
        status=S.BROKEN,
        score=5,
        labels_added=[L.NEEDS_REPAIR],
    ),
    _entry(
        "l6",
        "i2",
        E.REPAIR,
        "2026-02-01",
        "c3",
        "Replaced 80017A chips on voices 3 and 5. All six voices now producing audio.",
        score=7,
    ),
    _entry(
        "l7",
        "i2",
        E.ASSESSMENT,
        "2026-02-14",
        "c1",
        "All six voices consistent. Chorus both modes functional. Approved for display.",
        status=S.WORKING,
        score=9,
        labels_removed=[L.NEEDS_REPAIR],
        location="Playroom",
    ),
    # i3 — ARP 2600
    _entry(
        "l8",
        "i3",
        E.ASSESSMENT,
        "2025-11-20",
        "c1",
        "Significant corrosion on PSU board. VCO 1 non-functional. VCF intact. No serial number visible.",
        status=S.BROKEN,
        score=2,
        labels_added=[L.NEEDS_REPAIR],
        location="Workshop",
    ),
    # i4 — Oberheim OB-Xa
    _entry(
        "l9",
        "i4",
        E.ASSESSMENT,
        "2026-01-28",
        "c3",
        "Eight-voice unit. Voices 1, 2, 7 producing audio. Five others silent. Panel switches intermittent.",
        status=S.BROKEN,
        score=3,
        labels_added=[L.NEEDS_REPAIR],
    ),
    _entry(
        "l10",
        "i4",
        E.FAULT_REPORT,
        "2026-02-15",
        "c6",
        "Pitch wheel not returning to centre. Several panel LEDs not illuminating.",
        labels_added=[L.NEEDS_INVESTIGATION],
    ),
    # i5 — Korg MS-20 (early)
    _entry(
        "l11",
        "i5",
        E.ASSESSMENT,
        "2025-09-10",
        "c1",
        "Both oscillators stable. Filter working and self-oscillating. All patch points functional.",
        status=S.WORKING,
        score=8,
        location="Playroom",
    ),
    _entry(
        "l12",
        "i5",
        E.CLEANING,
        "2025-10-02",
        "c6",
        "Panel cleaned. Knob caps stabilised. Patch bay contacts cleaned.",
        score=9,
    ),
    # i6 — Sequential Prophet-5
    _entry(
        "l13",
        "i6",
        E.ASSESSMENT,
        "2026-01-05",
        "c1",
        "Voices 2 and 4 intermittent. Patch memory intact. Needs voice card inspection.",
        status=S.BROKEN,
        score=5,
        labels_added=[L.NEEDS_REPAIR],
    ),
    _entry(
        "l14",
        "i6",
        E.REPAIR,
        "2026-01-20",
        "c3",
        "Reseated voice card connectors. Voice 4 stable. Voice 2 still dropping — CEM3340 suspected. Replacement ordered.",
        score=6,
        location="Sent to external tech",
    ),
    _entry(
        "l15",
        "i6",
        E.FAULT_REPORT,
        "2026-02-10",
        None,
        "Pitch wheel not returning to centre. Spring feels weak.",
        labels_added=[L.NEEDS_INVESTIGATION],
    ),
    # i7 — Yamaha CS-80
    _entry(
        "l16",
        "i7",
        E.ASSESSMENT,
        "2025-12-01",
        "c1",
        "Several keys not sounding. Ribbon unresponsive. PSU slightly low on +15V.",
        status=S.BROKEN,
        score=4,
        labels_added=[L.NEEDS_REPAIR],
    ),
    _entry(
        "l17",
        "i7",
        E.REPAIR,
        "2026-01-10",
        "c3",
        "Recapped PSU. Eight keys restored. Ribbon replaced and working.",
        score=7,
    ),
    _entry(
        "l18",
        "i7",
        E.ASSESSMENT,
        "2026-02-20",
        "c2",
        "Mostly functional but persistent tuning drift on upper octave — temperature dependent. Not yet suitable for display.",
        score=7,
    ),
    # i8 — EMS Synthi AKS
    _entry(
        "l19",
        "i8",
        E.ASSESSMENT,
        "2025-09-10",
        "c2",
        "Pin matrix intact. Oscillators drifting. Full calibration required.",
        status=S.BROKEN,
        score=6,
        labels_added=[L.NEEDS_REPAIR],
    ),
    _entry(
        "l20",
        "i8",
        E.REPAIR,
        "2025-10-01",
        "c3",
        "Full calibration completed. All oscillators and noise source confirmed working.",
        status=S.WORKING,
        score=9,
        labels_removed=[L.NEEDS_REPAIR],
    ),
    _entry(
        "l21",
        "i8",
        E.FAULT_REPORT,
        "2026-03-10",
        None,
        "Pin matrix joystick sticky, not springing back. Noticed during visitor demo.",
        status=S.UNKNOWN,
        labels_added=[L.NEEDS_INVESTIGATION],
    ),
    # i9 — Roland TB-303
    _entry(
        "l22",
        "i9",
        E.ASSESSMENT,
        "2024-06-01",
        "c1",
        "All functions working. Accents and slides correct. Minor cosmetic wear only.",
        status=S.WORKING,
        score=9,
        location="Display case A",
    ),
    # i10 — Buchla 200 System (no log entries)
    # i11 — Korg Poly-61
    _entry(
        "l23",
        "i11",
        E.ASSESSMENT,
        "2024-03-10",
        "c3",
        "Beyond economic repair. Multiple failed voice chips, corroded PCBs. Retained for donor parts.",
        status=S.RETIRED,
        score=1,
        location="Storage B",
    ),
    # i12 — Roland Juno-60
    _entry(
        "l24",
        "i12",
        E.ASSESSMENT,
        "2024-01-15",
        "c4",
        "Duplicate unit. Sold to fund acquisition of ARP 2600.",
        status=S.DISPOSED,
    ),
    # i13 — Korg MS-20 (late)
    _entry(
        "l25",
        "i13",
        E.ASSESSMENT,
        "2026-02-01",
        "c5",
        "Fully functional. Both oscillators stable. Panel and knobs heavily soiled from previous owner.",
        status=S.WORKING,
        score=7,
        labels_added=[L.NEEDS_CLEANING],
    ),
]


def seed():
    from sqlmodel import SQLModel

    SQLModel.metadata.drop_all(engine)
    create_db()

    with Session(engine) as db:
        for c in CONTRIBUTORS:
            db.add(c)
        for i in INSTRUMENTS:
            db.add(i)
        db.commit()

        for e in LOG_ENTRIES:
            db.add(e)
        db.commit()

    print(
        f"Seeded {len(CONTRIBUTORS)} contributors, {len(INSTRUMENTS)} instruments, {len(LOG_ENTRIES)} log entries."
    )


if __name__ == "__main__":
    seed()
