from fastapi import APIRouter, Request, HTTPException, Depends
from sqlmodel import Session, select

from database import get_db
from models import Contributor
from permissions import AUTHENTICATED_CAPABILITIES, GUEST_CAPABILITIES
from config import DEMO_PASSWORD
from schemas import LoginRequest, SessionResponse, UserResponse, Capabilities, LoginUser

router = APIRouter(prefix="/auth", tags=["auth"])


def get_session_data(request: Request) -> SessionResponse | None:
    """Dependency: returns the current session or None."""
    data = request.session.get("data")
    if not data:
        return None
    return SessionResponse(**data)


def require_session(request: Request) -> SessionResponse:
    """Dependency: returns the current session or raises 401."""
    data = request.session.get("data")
    if not data:
        raise HTTPException(401, "Not authenticated")
    return SessionResponse(**data)


@router.post("/login", response_model=SessionResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    if body.password != DEMO_PASSWORD:
        raise HTTPException(401, "Invalid password")

    contributor = db.exec(
        select(Contributor).where(Contributor.drupal_user_id == body.user_id)
    ).first()
    if not contributor:
        raise HTTPException(401, "User not found")

    session_data = SessionResponse(
        user=UserResponse(id=contributor.id, name=contributor.name),
        capabilities=AUTHENTICATED_CAPABILITIES,
    )
    request.session["data"] = session_data.model_dump()
    return session_data


@router.post("/guest", response_model=SessionResponse)
def login_as_guest(request: Request):
    session_data = SessionResponse(
        user=None,
        capabilities=GUEST_CAPABILITIES,
    )
    request.session["data"] = session_data.model_dump()
    return session_data


@router.get("/session", response_model=SessionResponse)
def get_current_session(session: SessionResponse = Depends(require_session)):
    return session


@router.get("/users", response_model=list[LoginUser])
def get_login_users(db: Session = Depends(get_db)):
    """List contributors with Drupal accounts (for the login dropdown)."""
    contributors = db.exec(
        select(Contributor).where(Contributor.drupal_user_id.isnot(None))
    ).all()
    return [
        LoginUser(id=c.drupal_user_id, name=c.name)
        for c in contributors
    ]


@router.post("/logout", status_code=204)
def logout(request: Request):
    request.session.clear()
