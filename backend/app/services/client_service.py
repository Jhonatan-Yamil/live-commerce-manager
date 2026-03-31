from sqlalchemy.orm import Session

from app.repositories import client_repository


def create_client(db: Session, payload: dict):
    return client_repository.create_client(db, payload)


def list_clients(db: Session):
    return client_repository.list_clients(db)


def get_client(db: Session, client_id: int):
    return client_repository.get_client_by_id(db, client_id)


def update_client(db: Session, client_id: int, payload: dict):
    return client_repository.update_client(db, client_id, payload)
