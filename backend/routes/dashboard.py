from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from sqlalchemy.orm import joinedload

from database import get_db
from models import Instrument, LogEntry
from computed import get_instrument_state
from enums import InstrumentStatus, LabelKey
from config import DASHBOARD_FEED_LIMIT
from schemas import DashboardStats, ActivityEntry

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    instruments = db.exec(select(Instrument)).all()

    status_counts = {s.value: 0 for s in InstrumentStatus}
    label_counts = {l.value: 0 for l in LabelKey}
    display_ready = 0
    needs_attention = 0

    for inst in instruments:
        state = get_instrument_state(db, inst.id)
        status_counts[state.status] = status_counts.get(state.status, 0) + 1
        if state.display_ready:
            display_ready += 1
        if len(state.labels) > 0:
            needs_attention += 1
        for label in state.labels:
            label_counts[label] = label_counts.get(label, 0) + 1

    return DashboardStats(
        total=len(instruments),
        statusCounts=status_counts,
        labelCounts=label_counts,
        displayReady=display_ready,
        needsAttention=needs_attention,
    )


@router.get("/activity", response_model=list[ActivityEntry])
def get_recent_activity(
    limit: int = Query(default=DASHBOARD_FEED_LIMIT),
    db: Session = Depends(get_db),
):
    entries = db.exec(
        select(LogEntry)
        .options(joinedload(LogEntry.instrument), joinedload(LogEntry.contributor))
        .order_by(LogEntry.performed_at.desc(), LogEntry.created_at.desc())
        .limit(limit)
    ).unique().all()

    return [
        ActivityEntry(
            id=entry.id,
            type=entry.entry_type,
            date=entry.performed_at,
            contributor_id=entry.contributor_id,
            contributor_name=entry.contributor.name if entry.contributor else None,
            notes=entry.notes,
            status=entry.status,
            score=entry.condition_score,
            location=entry.location,
            labels_added=entry.labels_added or [],
            labels_removed=entry.labels_removed or [],
            instrumentId=entry.instrument_id,
            instrumentName=entry.instrument.display_name if entry.instrument else "Unknown",
        )
        for entry in entries
    ]
