from sqlalchemy.orm import Session

from app.repositories import logistics_repository


def create_logistics(db: Session, payload: dict, user_id: int | None = None):
    return logistics_repository.create_logistics(db, payload, user_id=user_id)


def list_logistics(db: Session, user_id: int | None = None):
    return logistics_repository.list_logistics(db, user_id=user_id)


def get_logistics(db: Session, logistics_id: int, user_id: int | None = None):
    return logistics_repository.get_logistics_by_id(db, logistics_id, user_id=user_id)


def update_logistics(db: Session, logistics_id: int, payload: dict, user_id: int | None = None):
    return logistics_repository.update_logistics(db, logistics_id, payload, user_id=user_id)
