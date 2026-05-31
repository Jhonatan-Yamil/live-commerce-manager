from sqlalchemy.orm import Session

from app.models.client import Client
from app.repositories.crud_utils import create_entity, get_entity_by_id, list_entities, update_entity, scoped_query


def create_client(db: Session, payload: dict):
    return create_entity(db, Client, payload)


def list_clients(db: Session, user_id: int | None = None):
    return scoped_query(db, Client, user_id=user_id).all()


def get_client_by_id(db: Session, client_id: int, user_id: int | None = None):
    q = scoped_query(db, Client, user_id=user_id)
    return q.filter(Client.id == client_id).first()


def update_client(db: Session, client_id: int, payload: dict, user_id: int | None = None):
    client = get_client_by_id(db, client_id, user_id=user_id)
    return update_entity(db, client, payload)
