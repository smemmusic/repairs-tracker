import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import get_db
from models import Instrument, LogEntry
from computed import get_current_status, get_current_score, get_current_labels
from permissions import authorize_add_entry, enforce_guest_overrides, authorize_edit_entry, authorize_delete_entry
from routes.auth import require_session
from routes.instruments import build_instrument_detail, build_log_entry_response
from schemas import (
    SessionResponse, AddLogEntryRequest, EditLogEntryRequest,
    AddLogEntryResponse, MutateInstrumentResponse,
)

router = APIRouter(prefix="/instruments/{instrument_id}/log", tags=["log_entries"])


@router.post("", response_model=AddLogEntryResponse)
def add_log_entry(
    instrument_id: str,
    body: AddLogEntryRequest,
    db: Session = Depends(get_db),
    session: SessionResponse = Depends(require_session),
):
    caps = session.capabilities
    has_status = body.status is not None
    has_labels = len(body.labels_added) > 0 or len(body.labels_removed) > 0
    authorize_add_entry(body.type, has_status, has_labels, caps)

    instrument = db.get(Instrument, instrument_id)
    if not instrument:
        raise HTTPException(404, "Instrument not found")

    current_status = get_current_status(db, instrument_id)
    current_score = get_current_score(db, instrument_id)
    current_labels = get_current_labels(db, instrument_id)

    # Guest override
    overrides = enforce_guest_overrides(body.type, current_status, current_labels, caps)

    # Determine effective status (only record if it changed)
    raw_status = overrides.status if overrides else body.status
    effective_status = raw_status if raw_status and raw_status != current_status else None

    # Determine effective score (only record if it changed)
    effective_score = body.score if body.score is not None and body.score != current_score else None

    # Determine effective labels
    labels_added = overrides.labels_added if overrides else body.labels_added
    labels_removed = overrides.labels_removed if overrides else body.labels_removed

    # Filter: only add labels not already present, only remove labels that are present
    labels_added = [l for l in labels_added if l not in current_labels]
    labels_removed = [l for l in labels_removed if l in current_labels]

    # Resolve contributor from session
    contributor_id = session.user.id if session.user else None

    entry = LogEntry(
        id=str(uuid.uuid4()),
        instrument_id=instrument_id,
        contributor_id=contributor_id,
        performed_at=body.date or date.today(),
        created_at=datetime.utcnow(),
        entry_type=body.type,
        notes=body.notes,
        status=effective_status,
        condition_score=effective_score,
        location=body.location or None,
        labels_added=labels_added,
        labels_removed=labels_removed,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)
    db.refresh(instrument)

    return AddLogEntryResponse(
        instrument=build_instrument_detail(db, instrument, caps),
        logEntry=build_log_entry_response(entry, caps),
    )


@router.put("/{entry_id}", response_model=MutateInstrumentResponse)
def edit_log_entry(
    instrument_id: str,
    entry_id: str,
    body: EditLogEntryRequest,
    db: Session = Depends(get_db),
    session: SessionResponse = Depends(require_session),
):
    caps = session.capabilities
    authorize_edit_entry(caps)

    instrument = db.get(Instrument, instrument_id)
    if not instrument:
        raise HTTPException(404, "Instrument not found")

    entry = db.get(LogEntry, entry_id)
    if not entry or entry.instrument_id != instrument_id:
        raise HTTPException(404, "Log entry not found")

    # Only update fields explicitly sent in the request body
    provided = body.model_fields_set
    if "notes" in provided:
        entry.notes = body.notes
    if "status" in provided:
        entry.status = body.status
    if "score" in provided:
        entry.condition_score = body.score
    if "location" in provided:
        entry.location = body.location
    if "labels_added" in provided:
        entry.labels_added = list(body.labels_added) if body.labels_added else []
    if "labels_removed" in provided:
        entry.labels_removed = list(body.labels_removed) if body.labels_removed else []

    db.add(entry)
    db.commit()
    db.refresh(instrument)

    return MutateInstrumentResponse(
        instrument=build_instrument_detail(db, instrument, caps),
    )


@router.delete("/{entry_id}", response_model=MutateInstrumentResponse)
def delete_log_entry(
    instrument_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    session: SessionResponse = Depends(require_session),
):
    caps = session.capabilities
    authorize_delete_entry(caps)

    instrument = db.get(Instrument, instrument_id)
    if not instrument:
        raise HTTPException(404, "Instrument not found")

    entry = db.get(LogEntry, entry_id)
    if not entry or entry.instrument_id != instrument_id:
        raise HTTPException(404, "Log entry not found")

    db.delete(entry)
    db.commit()
    db.refresh(instrument)

    return MutateInstrumentResponse(
        instrument=build_instrument_detail(db, instrument, caps),
    )
