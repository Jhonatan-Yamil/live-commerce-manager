from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.order import OrderItem


def create_lot(db: Session, payload: dict):
    lot = Lot(**payload)
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot


def list_lots(db: Session):
    return db.query(Lot).all()


def get_lot_by_id(db: Session, lot_id: int):
    return db.query(Lot).filter(Lot.id == lot_id).first()


def update_lot(db: Session, lot_id: int, payload: dict):
    lot = get_lot_by_id(db, lot_id)
    if not lot:
        return None

    for key, value in payload.items():
        setattr(lot, key, value)

    db.commit()
    db.refresh(lot)
    return lot


def list_order_items_by_lot(db: Session, lot_id: int):
    return db.query(OrderItem).filter(OrderItem.lot_id == lot_id).all()
