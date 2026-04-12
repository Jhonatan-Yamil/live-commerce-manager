import os
import shutil
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.repositories import voucher_intake_repository


UPLOAD_DIR = "uploads/intake"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


def _validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Solo se permiten archivos JPG, PNG o PDF")
    return ext


def create_intake_from_upload(
    db: Session,
    current_user: User,
    *,
    file,
    source_channel: VoucherSourceChannel = VoucherSourceChannel.manual,
    external_chat_id: str | None = None,
    external_message_id: str | None = None,
    sender_phone: str | None = None,
):
    ext = _validate_extension(file.filename)

    filename = f"intake_{source_channel.value}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    payload = {
        "source_channel": source_channel,
        "external_chat_id": external_chat_id,
        "external_message_id": external_message_id,
        "sender_phone": sender_phone,
        "file_path": filename,
        "mime_type": file.content_type,
        "match_status": VoucherMatchStatus.pending,
        "reviewed_by_user_id": None,
        "reviewed_at": None,
    }
    return voucher_intake_repository.create_intake(db, payload)


def list_intakes(db: Session, status: VoucherMatchStatus | None = None, skip: int = 0, limit: int = 100):
    return voucher_intake_repository.list_intakes(db, status=status, skip=skip, limit=limit)
