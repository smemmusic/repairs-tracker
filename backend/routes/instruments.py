from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_db
from models import Instrument, LogEntry
from computed import get_instrument_state
from permissions import filter_log_for_view
from routes.auth import get_session_data
from schemas import (
    SessionResponse, Capabilities, InstrumentSummary, InstrumentDetail, LogEntryResponse,
)

router = APIRouter(prefix="/instruments", tags=["instruments"])


def build_log_entry_response(entry: LogEntry, caps: Capabilities) -> LogEntryResponse:
    return LogEntryResponse(
        id=entry.id,
        type=entry.entry_type,
        date=entry.performed_at,
        contributor_id=entry.contributor_id,
        notes=entry.notes,
        status=entry.status,
        score=entry.condition_score if caps.viewScores else None,
        location=entry.location,
        labels_added=entry.labels_added or [],
        labels_removed=entry.labels_removed or [],
        attachments=[],
    )


def build_instrument_detail(db: Session, instrument: Instrument, caps: Capabilities) -> InstrumentDetail:
    state = get_instrument_state(db, instrument.id)

    entries = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument.id)
        .order_by(LogEntry.performed_at.asc(), LogEntry.created_at.asc())
    ).all()
    filtered = filter_log_for_view(entries, caps)

    return InstrumentDetail(
        id=instrument.id,
        airtable_id=instrument.airtable_id,
        display_name=instrument.display_name,
        serial_number=instrument.serial_number,
        status=state.status,
        score=state.score if caps.viewScores else None,
        labels=state.labels,
        location=state.location,
        display_ready=state.display_ready,
        log=[build_log_entry_response(e, caps) for e in filtered],
    )


def build_instrument_summary(db: Session, instrument: Instrument) -> InstrumentSummary:
    state = get_instrument_state(db, instrument.id)
    return InstrumentSummary(
        id=instrument.id,
        airtable_id=instrument.airtable_id,
        display_name=instrument.display_name,
        serial_number=instrument.serial_number,
        status=state.status,
        score=state.score,
        labels=state.labels,
        location=state.location,
        display_ready=state.display_ready,
    )


@router.get("", response_model=list[InstrumentSummary])
def list_instruments(
    filter: str = Query("all"),
    search: str = Query(""),
    db: Session = Depends(get_db),
):
    instruments = db.exec(select(Instrument)).all()
    results: list[InstrumentSummary] = []

    for inst in instruments:
        summary = build_instrument_summary(db, inst)

        if filter == "display_ready":
            if not summary.display_ready:
                continue
        elif filter != "all":
            if summary.status != filter:
                continue

        if search:
            q = search.lower()
            name_match = q in inst.display_name.lower()
            serial_match = inst.serial_number and q in inst.serial_number.lower()
            if not name_match and not serial_match:
                continue

        results.append(summary)

    return results


@router.get("/{instrument_id}", response_model=InstrumentDetail)
def get_instrument(
    instrument_id: str,
    db: Session = Depends(get_db),
    session: SessionResponse | None = Depends(get_session_data),
):
    instrument = db.get(Instrument, instrument_id)
    if not instrument:
        raise HTTPException(404, "Instrument not found")

    caps = session.capabilities if session else Capabilities()
    return build_instrument_detail(db, instrument, caps)
