from sqlalchemy.orm import Session

from app.models.logistics import Logistics
from app.models.order import Order
from app.repositories.crud_utils import get_entity_by_id, list_entities, update_entity, scoped_query


def create_logistics(db: Session, payload: dict, user_id: int | None = None):
    # ensure order belongs to user when user_id is provided
    if user_id is not None:
        order = db.query(Order).filter(Order.id == payload["order_id"]).first()
        if not order or getattr(order, "user_id", None) != user_id:
            return None

    existing = db.query(Logistics).filter(Logistics.order_id == payload["order_id"]).first()
    if existing:
        return None

    logistics = Logistics(**payload)
    if user_id is not None and getattr(logistics, "user_id", None) is None:
        logistics.user_id = user_id
    db.add(logistics)
    db.commit()
    db.refresh(logistics)
    return logistics


def list_logistics(db: Session, user_id: int | None = None):
    return scoped_query(db, Logistics, user_id=user_id).all()


def get_logistics_by_id(db: Session, logistics_id: int, user_id: int | None = None):
    q = scoped_query(db, Logistics, user_id=user_id)
    return q.filter(Logistics.id == logistics_id).first()


def update_logistics(db: Session, logistics_id: int, payload: dict, user_id: int | None = None):
    logistics = get_logistics_by_id(db, logistics_id, user_id=user_id)
    return update_entity(db, logistics, payload)
