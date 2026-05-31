from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.order import Order, OrderItem, OrderStatus
from app.repositories.crud_utils import create_entity, get_entity_by_id, list_entities, update_entity, scoped_query


def create_lot(db: Session, payload: dict):
    return create_entity(db, Lot, payload)


def list_lots(db: Session, user_id: int | None = None):
    return scoped_query(db, Lot, user_id=user_id).all()


def get_lot_by_id(db: Session, lot_id: int, user_id: int | None = None):
    q = scoped_query(db, Lot, user_id=user_id)
    return q.filter(Lot.id == lot_id).first()


def update_lot(db: Session, lot_id: int, payload: dict, user_id: int | None = None):
    lot = get_lot_by_id(db, lot_id, user_id=user_id)
    return update_entity(db, lot, payload)


def list_order_items_by_lot(db: Session, lot_id: int, user_id: int | None = None):
    q = (
        db.query(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(OrderItem.lot_id == lot_id, Order.status == OrderStatus.payment_confirmed)
    )
    if user_id is not None:
        q = q.filter(Order.user_id == user_id)
    return q.all()
