from app.services.payment.serialization import list_payments
from app.services.payment.status import register_voucher, update_payment_status
from app.repositories import payment_repository
from sqlalchemy.orm import Session
from app.models.order import Order


def get_payment(db: Session, payment_id: int, user_id: int | None = None):
    return payment_repository.get_by_id(db, payment_id, user_id=user_id)


def get_payment_by_order(db: Session, order_id: int, user_id: int | None = None):
    return payment_repository.get_by_order_id(db, order_id, user_id=user_id)
