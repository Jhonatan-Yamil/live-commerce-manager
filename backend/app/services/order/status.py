from sqlalchemy.orm import Session

from app.models.order import OrderStatus
from app.repositories import order_repository


def get_orders(db: Session, skip: int = 0, limit: int = 100, user_id: int | None = None):
    return order_repository.list_orders(db, skip, limit, user_id=user_id)


def get_order(db: Session, order_id: int, user_id: int | None = None):
    return order_repository.get_order_by_id(db, order_id, user_id=user_id)


def update_order_status(db: Session, order_id: int, status: OrderStatus, user_id: int | None = None):
    order = order_repository.get_order_for_update(db, order_id, user_id=user_id)
    if order:
        order.status = status
        db.commit()
        db.refresh(order)
    return order


def build_order_status_update_response(order) -> dict:
    return {"message": "Estado actualizado", "status": order.status}