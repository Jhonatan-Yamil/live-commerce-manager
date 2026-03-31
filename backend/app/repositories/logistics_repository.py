from sqlalchemy.orm import Session

from app.models.logistics import Logistics


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
    return db.query(Logistics).all()


def get_logistics_by_id(db: Session, logistics_id: int):
    return db.query(Logistics).filter(Logistics.id == logistics_id).first()


def update_logistics(db: Session, logistics_id: int, payload: dict):
    logistics = get_logistics_by_id(db, logistics_id)
    if not logistics:
        return None

    for key, value in payload.items():
        setattr(logistics, key, value)

    db.commit()
    db.refresh(logistics)
    return logistics
