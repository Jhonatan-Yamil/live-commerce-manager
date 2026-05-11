from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.payment import PaymentStatus
from app.repositories import payment_repository


def _apply_order_status(order: Order | None, payment_status: PaymentStatus) -> None:
    if not order:
        return

    mapping = {
        PaymentStatus.pending: OrderStatus.pending_payment,
        PaymentStatus.in_review: OrderStatus.payment_in_review,
        PaymentStatus.confirmed: OrderStatus.payment_confirmed,
        PaymentStatus.rejected: OrderStatus.payment_rejected,
    }
    order.status = mapping[payment_status]


def update_payment_status(db: Session, payment_id: int, status: PaymentStatus, notes: str = None):
    payment = payment_repository.get_by_id(db, payment_id)
    if not payment:
        return None

    payment.status = status
    if notes:
        payment.notes = notes
    payment.reviewed_at = datetime.now(timezone.utc)

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    _apply_order_status(order, status)

    db.commit()
    db.refresh(payment)
    return payment


def register_voucher(db: Session, order_id: int, voucher_path: str):
    payment = payment_repository.get_by_order_id(db, order_id)
    if not payment:
        return None

    payment.voucher_path = voucher_path
    payment.status = PaymentStatus.in_review
    order = db.query(Order).filter(Order.id == order_id).first()
    _apply_order_status(order, PaymentStatus.in_review)

    db.commit()
    db.refresh(payment)
    return payment