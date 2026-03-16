import uuid

from fastapi import APIRouter, UploadFile
from pydantic import BaseModel

from config import UPLOAD_DIR

router = APIRouter(prefix="/attachments", tags=["attachments"])


class AttachmentResponse(BaseModel):
    id: str
    file_name: str
    mime_type: str
    url: str


@router.post("/upload", response_model=AttachmentResponse)
async def upload_attachment(file: UploadFile):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
    stored_name = f"{file_id}.{ext}" if ext else file_id
    file_path = UPLOAD_DIR / stored_name

    contents = await file.read()
    file_path.write_bytes(contents)

    return AttachmentResponse(
        id=file_id,
        file_name=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        url=f"/uploads/{stored_name}",
    )
