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
