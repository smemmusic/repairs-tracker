import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, HTTPException, Depends
from sqlmodel import Session

from config import UPLOAD_DIR
from database import get_db
from models import Attachment
from routes.auth import require_session
from schemas import SessionResponse, AttachmentResponse

router = APIRouter(prefix="/attachments", tags=["attachments"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=AttachmentResponse)
async def upload_attachment(
    file: UploadFile,
    db: Session = Depends(get_db),
    session: SessionResponse = Depends(require_session),
):
    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
    stored_name = f"{file_id}.{ext}" if ext else file_id
    dest = UPLOAD_DIR / stored_name

    # Stream to disk with size limit
    size = 0
    with open(dest, "wb") as f:
        while chunk := await file.read(8192):
            size += len(chunk)
            if size > MAX_UPLOAD_SIZE:
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"File too large (max {MAX_UPLOAD_SIZE // 1024 // 1024} MB)")
            f.write(chunk)

    # Save record (unlinked — log_entry_id set when log entry is created)
    attachment = Attachment(
        id=file_id,
        file_path=stored_name,
        file_name=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_at=datetime.utcnow(),
    )
    db.add(attachment)
    db.commit()

    return AttachmentResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        mime_type=attachment.mime_type,
        url=f"/uploads/{stored_name}",
    )
