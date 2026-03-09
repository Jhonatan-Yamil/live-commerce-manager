from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.payment import Payment, PaymentStatus
from app.models.order import Order, OrderStatus


def update_payment_status(db: Session, payment_id: int, status: PaymentStatus, notes: str = None):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        return None
    payment.status = status
    if notes:
        payment.notes = notes
    payment.reviewed_at = datetime.now(timezone.utc)

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if order:
        mapping = {
            PaymentStatus.pending: OrderStatus.pending_payment,
            PaymentStatus.in_review: OrderStatus.payment_in_review,
            PaymentStatus.confirmed: OrderStatus.payment_confirmed,
            PaymentStatus.rejected: OrderStatus.payment_rejected,
        }
        order.status = mapping[status]

    db.commit()
    db.refresh(payment)
    return payment


def register_voucher(db: Session, order_id: int, voucher_path: str):
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        return None
    payment.voucher_path = voucher_path
    payment.status = PaymentStatus.in_review
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.status = OrderStatus.payment_in_review
    db.commit()
    db.refresh(payment)
    return payment