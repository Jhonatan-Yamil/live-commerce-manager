from sqlalchemy.orm import Session

from app.models.order import OrderStatus
from app.repositories import order_repository


def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return order_repository.list_orders(db, skip, limit)


def get_order(db: Session, order_id: int):
    return order_repository.get_order_by_id(db, order_id)


def update_order_status(db: Session, order_id: int, status: OrderStatus):
    order = order_repository.get_order_for_update(db, order_id)
    if order:
        order.status = status
        db.commit()
        db.refresh(order)
    return order