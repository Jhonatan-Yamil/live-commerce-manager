from sqlalchemy.orm import Session

from app.repositories import logistics_repository


def create_logistics(db: Session, payload: dict):
    return logistics_repository.create_logistics(db, payload)


def list_logistics(db: Session):
    return logistics_repository.list_logistics(db)


def get_logistics(db: Session, logistics_id: int):
    return logistics_repository.get_logistics_by_id(db, logistics_id)


def update_logistics(db: Session, logistics_id: int, payload: dict):
    return logistics_repository.update_logistics(db, logistics_id, payload)
