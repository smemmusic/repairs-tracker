"""Reusable FastAPI dependency types using Annotated."""

from typing import Annotated

from fastapi import Depends, Request, HTTPException
from sqlmodel import Session

from database import get_db
from schemas import SessionResponse


def _get_session_data(request: Request) -> SessionResponse | None:
    """Returns the current session or None."""
    data = request.session.get("data")
    if not data:
        return None
    return SessionResponse(**data)


def _require_session(request: Request) -> SessionResponse:
    """Returns the current session or raises 401."""
    data = request.session.get("data")
    if not data:
        raise HTTPException(401, "Not authenticated")
    return SessionResponse(**data)


DbSession = Annotated[Session, Depends(get_db)]
Auth = Annotated[SessionResponse, Depends(_require_session)]
OptionalAuth = Annotated[SessionResponse | None, Depends(_get_session_data)]
