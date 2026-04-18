from datetime import datetime
from sqlalchemy.orm import Session
from app.models.voucher_intake import VoucherIntake, VoucherMatchStatus


def create_intake(db: Session, payload: dict):
    intake = VoucherIntake(**payload)
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


def list_intakes(db: Session, status: VoucherMatchStatus | None = None, skip: int = 0, limit: int = 100):
    q = db.query(VoucherIntake)
    if status:
        q = q.filter(VoucherIntake.match_status == status)
    return q.order_by(VoucherIntake.id.desc()).offset(skip).limit(limit).all()


def get_by_id(db: Session, intake_id: int):
    return db.query(VoucherIntake).filter(VoucherIntake.id == intake_id).first()


def save(db: Session, intake: VoucherIntake):
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


def get_by_external_message(
    db: Session,
    *,
    source_channel: str,
    external_chat_id: str,
    external_message_id: str,
):
    return (
        db.query(VoucherIntake)
        .filter(
            VoucherIntake.source_channel == source_channel,
            VoucherIntake.external_chat_id == external_chat_id,
            VoucherIntake.external_message_id == external_message_id,
        )
        .first()
    )


def get_recent_by_hash(db: Session, *, file_sha256: str, since: datetime):
    return (
        db.query(VoucherIntake)
        .filter(
            VoucherIntake.file_sha256 == file_sha256,
            VoucherIntake.created_at >= since,
        )
        .order_by(VoucherIntake.id.desc())
        .first()
    )
