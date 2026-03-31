from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.payment import Payment, PaymentStatus
from app.models.order import Order, OrderStatus
from app.schemas.payment import PaymentOut
from app.repositories import payment_repository


def list_payments(db: Session):
    rows = payment_repository.list_with_context(db)
    result = []

    for payment, order, client in rows:
        result.append(
            PaymentOut(
                id=payment.id,
                order_id=payment.order_id,
                status=payment.status,
                voucher_path=payment.voucher_path,
                notes=payment.notes,
                reviewed_at=payment.reviewed_at,
                created_at=payment.created_at,
                client_name=client.full_name if client else None,
                order_created_at=order.created_at if order else None,
                order_total=float(order.total) if order else None,
            )
        )

    return result


def get_payment(db: Session, payment_id: int):
    return payment_repository.get_by_id(db, payment_id)


def get_payment_by_order(db: Session, order_id: int):
    return payment_repository.get_by_order_id(db, order_id)


def update_payment_status(db: Session, payment_id: int, status: PaymentStatus, notes: str = None):
    payment = payment_repository.get_by_id(db, payment_id)
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
    payment = payment_repository.get_by_order_id(db, order_id)
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