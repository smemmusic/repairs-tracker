import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, HTTPException

from config import UPLOAD_DIR, MAX_UPLOAD_SIZE
from deps import DbSession, Auth
from models import Attachment
from schemas import AttachmentResponse

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.post("/upload")
async def upload_attachment(file: UploadFile, db: DbSession, session: Auth) -> AttachmentResponse:
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
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(attachment)
    db.commit()

    return AttachmentResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        mime_type=attachment.mime_type,
        url=f"/uploads/{stored_name}",
    )
