from sqlmodel import Session, select

from models import LogEntry
from enums import InstrumentStatus, LabelKey
from config import DISPLAY_READY_THRESHOLD
from schemas import InstrumentState


def get_instrument_state(db: Session, instrument_id: str) -> InstrumentState:
    """Derive all computed fields from a single query over the instrument's log entries."""
    entries = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument_id)
        .order_by(LogEntry.performed_at.asc(), LogEntry.created_at.asc())
    ).all()
    return _compute_state(entries)


def compute_state_from_entries(entries: list[LogEntry]) -> InstrumentState:
    """Public version for callers that already have entries loaded."""
    return _compute_state(entries)


def _compute_state(entries: list[LogEntry]) -> InstrumentState:
    status = InstrumentStatus.UNKNOWN
    score = None
    location = None
    labels: set[str] = set()

    for e in entries:
        if e.status is not None:
            status = InstrumentStatus(e.status)
        if e.condition_score is not None:
            score = e.condition_score
        if e.location is not None:
            location = e.location
        labels.update(e.labels_added or [])
        labels.difference_update(e.labels_removed or [])

    sorted_labels = sorted(LabelKey(l) for l in labels)
    return InstrumentState(
        status=status,
        score=score,
        labels=sorted_labels,
        location=location,
        display_ready=(
            status == InstrumentStatus.WORKING
            and len(sorted_labels) == 0
            and score is not None
            and score >= DISPLAY_READY_THRESHOLD
        ),
    )
