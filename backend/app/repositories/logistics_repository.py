from sqlalchemy.orm import Session

from app.models.logistics import Logistics
from app.repositories.crud_utils import get_entity_by_id, list_entities, update_entity


def create_logistics(db: Session, payload: dict):
    existing = db.query(Logistics).filter(Logistics.order_id == payload["order_id"]).first()
    if existing:
        return None

    logistics = Logistics(**payload)
    db.add(logistics)
    db.commit()
    db.refresh(logistics)
    return logistics


def list_logistics(db: Session):
    return list_entities(db, Logistics)


def get_logistics_by_id(db: Session, logistics_id: int):
    return get_entity_by_id(db, Logistics, logistics_id)


def update_logistics(db: Session, logistics_id: int, payload: dict):
    logistics = get_logistics_by_id(db, logistics_id)
    return update_entity(db, logistics, payload)
