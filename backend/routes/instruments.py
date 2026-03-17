from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select
from sqlalchemy.orm import selectinload

from deps import DbSession, OptionalAuth
from models import Instrument, LogEntry, Contributor
from computed import get_instrument_state
from permissions import filter_log_for_view
from schemas import (
    Capabilities, InstrumentSummary, InstrumentDetail,
    LogEntryResponse, AttachmentResponse, InstrumentState,
)

router = APIRouter(prefix="/instruments", tags=["instruments"])


def resolve_contributor_name(db: DbSession, contributor_id: str | None) -> str | None:
    if not contributor_id:
        return None
    contributor = db.get(Contributor, contributor_id)
    return contributor.name if contributor else None


def build_log_entry_response(db: DbSession, entry: LogEntry, caps: Capabilities) -> LogEntryResponse:
    return LogEntryResponse(
        id=entry.id,
        type=entry.entry_type,
        date=entry.performed_at,
        contributor_id=entry.contributor_id,
        contributor_name=resolve_contributor_name(db, entry.contributor_id),
        notes=entry.notes,
        status=entry.status,
        score=entry.condition_score if caps.viewScores else None,
        location=entry.location,
        labels_added=entry.labels_added or [],
        labels_removed=entry.labels_removed or [],
        attachments=[
            AttachmentResponse(
                id=a.id,
                file_name=a.file_name,
                mime_type=a.mime_type,
                url=f"/uploads/{a.file_path}",
            )
            for a in (entry.attachments or [])
        ],
    )


def _build_summary(instrument: Instrument, state: InstrumentState, log_count: int) -> InstrumentSummary:
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
        log_count=log_count,
    )


def build_instrument_detail(db: DbSession, instrument: Instrument, caps: Capabilities) -> InstrumentDetail:
    entries = db.exec(
        select(LogEntry)
        .where(LogEntry.instrument_id == instrument.id)
        .options(selectinload(LogEntry.attachments))
        .order_by(LogEntry.performed_at.asc(), LogEntry.created_at.asc())
    ).all()
    state = get_instrument_state(db, instrument.id)
    filtered = filter_log_for_view(entries, caps)
    summary = _build_summary(instrument, state, len(entries))
    data = summary.model_dump()
    if not caps.viewScores:
        data["score"] = None

    return InstrumentDetail(
        **data,
        log=[build_log_entry_response(db, e, caps) for e in filtered],
    )


@router.get("")
def list_instruments(
    db: DbSession,
    filter: str = Query("all"),
    search: str = Query(""),
) -> list[InstrumentSummary]:
    instruments = db.exec(select(Instrument)).all()
    results: list[InstrumentSummary] = []

    for inst in instruments:
        state = get_instrument_state(db, inst.id)

        if filter == "display_ready":
            if not state.display_ready:
                continue
        elif filter != "all":
            if state.status != filter:
                continue

        if search:
            q = search.lower()
            if q not in inst.display_name.lower() and not (inst.serial_number and q in inst.serial_number.lower()):
                continue

        log_count = len(db.exec(
            select(LogEntry.id).where(LogEntry.instrument_id == inst.id)
        ).all())
        results.append(_build_summary(inst, state, log_count))

    return results


@router.get("/{instrument_id}")
def get_instrument(instrument_id: str, db: DbSession, session: OptionalAuth) -> InstrumentDetail:
    instrument = db.get(Instrument, instrument_id)
    if not instrument:
        raise HTTPException(404, "Instrument not found")

    caps = session.capabilities if session else Capabilities()
    return build_instrument_detail(db, instrument, caps)
