from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from config import DEMO_MODE, UPLOAD_DIR
from deps import DbSession
from models import Attachment
from seed import seed

router = APIRouter(prefix="/admin", tags=["admin"])

ORPHAN_TTL = timedelta(hours=24)


@router.post("/reset", status_code=204)
def reset_data():
    """Drop all data and re-seed. Demo mode only."""
    if not DEMO_MODE:
        raise HTTPException(403, "Reset is only available in demo mode")
    seed()


@router.post("/cleanup-attachments")
def cleanup_orphaned_attachments(db: DbSession) -> dict:
    """Delete unlinked attachments older than 24 hours."""
    cutoff = datetime.now(timezone.utc) - ORPHAN_TTL
    orphans = db.exec(
        select(Attachment).where(
            Attachment.log_entry_id.is_(None),
            Attachment.uploaded_at < cutoff,
        )
    ).all()

    deleted = 0
    for attachment in orphans:
        file_path = UPLOAD_DIR / attachment.file_path
        file_path.unlink(missing_ok=True)
        db.delete(attachment)
        deleted += 1

    db.commit()
    return {"deleted": deleted}
