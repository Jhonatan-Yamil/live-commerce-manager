from app.services.payment.serialization import list_payments
from app.services.payment.status import register_voucher, update_payment_status
from app.repositories import payment_repository


def get_payment(db, payment_id: int):
    return payment_repository.get_by_id(db, payment_id)


def get_payment_by_order(db, order_id: int):
    return payment_repository.get_by_order_id(db, order_id)
