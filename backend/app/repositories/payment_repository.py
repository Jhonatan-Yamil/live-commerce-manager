from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.order import Order
from app.models.payment import Payment


def list_with_context(db: Session):
    return (
        db.query(Payment, Order, Client)
        .outerjoin(Order, Payment.order_id == Order.id)
        .outerjoin(Client, Order.client_id == Client.id)
        .all()
    )


def get_by_id(db: Session, payment_id: int):
    return db.query(Payment).filter(Payment.id == payment_id).first()


def get_by_order_id(db: Session, order_id: int):
    return db.query(Payment).filter(Payment.order_id == order_id).first()
