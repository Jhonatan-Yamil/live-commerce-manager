from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.order import OrderItem
from app.repositories.crud_utils import create_entity, get_entity_by_id, list_entities, update_entity


def create_lot(db: Session, payload: dict):
    return create_entity(db, Lot, payload)


def list_lots(db: Session):
    return list_entities(db, Lot)


def get_lot_by_id(db: Session, lot_id: int):
    return get_entity_by_id(db, Lot, lot_id)


def update_lot(db: Session, lot_id: int, payload: dict):
    lot = get_lot_by_id(db, lot_id)
    return update_entity(db, lot, payload)


def list_order_items_by_lot(db: Session, lot_id: int):
    return db.query(OrderItem).filter(OrderItem.lot_id == lot_id).all()
