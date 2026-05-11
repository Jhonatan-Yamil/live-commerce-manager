from sqlalchemy.orm import Session

from app.models.client import Client
from app.repositories.crud_utils import create_entity, get_entity_by_id, list_entities, update_entity


def create_client(db: Session, payload: dict):
    return create_entity(db, Client, payload)


def list_clients(db: Session):
    return list_entities(db, Client)


def get_client_by_id(db: Session, client_id: int):
    return get_entity_by_id(db, Client, client_id)


def update_client(db: Session, client_id: int, payload: dict):
    client = get_client_by_id(db, client_id)
    return update_entity(db, client, payload)
