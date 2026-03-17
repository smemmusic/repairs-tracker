from fastapi import APIRouter, Request, HTTPException
from sqlmodel import select

from deps import DbSession, Auth
from models import Contributor
from permissions import AUTHENTICATED_CAPABILITIES, GUEST_CAPABILITIES
from config import DEMO_PASSWORD
from schemas import LoginRequest, SessionResponse, UserResponse, LoginUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, request: Request, db: DbSession) -> SessionResponse:
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


@router.post("/guest")
def login_as_guest(request: Request) -> SessionResponse:
    session_data = SessionResponse(
        user=None,
        capabilities=GUEST_CAPABILITIES,
    )
    request.session["data"] = session_data.model_dump()
    return session_data


@router.get("/session")
def get_current_session(session: Auth) -> SessionResponse:
    return session


@router.get("/users")
def get_login_users(db: DbSession) -> list[LoginUser]:
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
