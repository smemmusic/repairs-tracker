from sqlmodel import Session, select

from models import LogEntry
from enums import InstrumentStatus, LabelKey
from config import DISPLAY_READY_THRESHOLD
from schemas import InstrumentState


def get_current_status(db: Session, instrument_id: str) -> InstrumentStatus:
    entry = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument_id, LogEntry.status.isnot(None))
        .order_by(LogEntry.performed_at.desc(), LogEntry.created_at.desc())
    ).first()
    return InstrumentStatus(entry.status) if entry else InstrumentStatus.UNKNOWN


def get_current_score(db: Session, instrument_id: str) -> int | None:
    entry = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument_id, LogEntry.condition_score.isnot(None))
        .order_by(LogEntry.performed_at.desc(), LogEntry.created_at.desc())
    ).first()
    return entry.condition_score if entry else None


def get_current_labels(db: Session, instrument_id: str) -> list[LabelKey]:
    entries = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument_id)
        .order_by(LogEntry.performed_at.asc(), LogEntry.created_at.asc())
    ).all()
    labels: set[str] = set()
    for e in entries:
        labels.update(e.labels_added or [])
        labels.difference_update(e.labels_removed or [])
    return sorted(LabelKey(l) for l in labels)


def get_current_location(db: Session, instrument_id: str) -> str | None:
    entry = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument_id, LogEntry.location.isnot(None))
        .order_by(LogEntry.performed_at.desc(), LogEntry.created_at.desc())
    ).first()
    return entry.location if entry else None


def is_display_ready(db: Session, instrument_id: str) -> bool:
    return _check_display_ready(
        get_current_status(db, instrument_id),
        get_current_score(db, instrument_id),
        get_current_labels(db, instrument_id),
    )


def get_instrument_state(db: Session, instrument_id: str) -> InstrumentState:
    """Return all computed fields for an instrument."""
    status = get_current_status(db, instrument_id)
    score = get_current_score(db, instrument_id)
    labels = get_current_labels(db, instrument_id)
    location = get_current_location(db, instrument_id)
    return InstrumentState(
        status=status,
        score=score,
        labels=labels,
        location=location,
        display_ready=_check_display_ready(status, score, labels),
    )


def _check_display_ready(
    status: InstrumentStatus,
    score: int | None,
    labels: list[LabelKey],
) -> bool:
    return (
        status == InstrumentStatus.WORKING
        and len(labels) == 0
        and score is not None
        and score >= DISPLAY_READY_THRESHOLD
    )
