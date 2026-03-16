import uuid
import shutil

from fastapi import APIRouter, UploadFile, HTTPException, Depends
from pydantic import BaseModel

from config import UPLOAD_DIR
from routes.auth import require_session
from schemas import SessionResponse

router = APIRouter(prefix="/attachments", tags=["attachments"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


class AttachmentResponse(BaseModel):
    id: str
    file_name: str
    mime_type: str
    url: str


@router.post("/upload", response_model=AttachmentResponse)
async def upload_attachment(
    file: UploadFile,
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

    return AttachmentResponse(
        id=file_id,
        file_name=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        url=f"/uploads/{stored_name}",
    )
