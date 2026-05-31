from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.order import Order
from app.models.payment import Payment


def list_with_context(db: Session, user_id: int | None = None):
    q = (
        db.query(Payment, Order, Client)
        .outerjoin(Order, Payment.order_id == Order.id)
        .outerjoin(Client, Order.client_id == Client.id)
    )
    if user_id is not None:
        q = q.filter(Order.user_id == user_id)
    return q.all()


def get_by_id(db: Session, payment_id: int, user_id: int | None = None):
    q = db.query(Payment).filter(Payment.id == payment_id)
    if user_id is not None:
        q = q.join(Order, Payment.order_id == Order.id).filter(Order.user_id == user_id)
    return q.first()


def get_by_order_id(db: Session, order_id: int, user_id: int | None = None):
    q = db.query(Payment).filter(Payment.order_id == order_id)
    if user_id is not None:
        # ensure the order belongs to user
        q = q.join(Order, Payment.order_id == Order.id).filter(Order.user_id == user_id)
    return q.first()
