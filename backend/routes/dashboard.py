from fastapi import APIRouter, Query
from sqlmodel import select
from sqlalchemy.orm import joinedload

from deps import DbSession
from models import Instrument, LogEntry
from computed import get_all_instrument_states
from enums import InstrumentStatus, LabelKey
from config import DASHBOARD_FEED_LIMIT
from schemas import DashboardStats, ActivityEntry, InstrumentState

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: DbSession) -> DashboardStats:
    # 1 query: all instruments
    instruments = db.exec(select(Instrument)).all()

    # 1 query: all states (bulk)
    states = get_all_instrument_states(db)

    status_counts = {s.value: 0 for s in InstrumentStatus}
    label_counts = {l.value: 0 for l in LabelKey}
    display_ready = 0
    needs_attention = 0

    for inst in instruments:
        state = states.get(inst.id, InstrumentState(
            status="unknown", score=None, labels=[], location=None, display_ready=False,
        ))
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


@router.get("/activity")
def get_recent_activity(db: DbSession, limit: int = Query(default=DASHBOARD_FEED_LIMIT)) -> list[ActivityEntry]:
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
