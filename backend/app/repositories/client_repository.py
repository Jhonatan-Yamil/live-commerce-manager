from sqlalchemy.orm import Session

from app.models.client import Client


def create_client(db: Session, payload: dict):
    client = Client(**payload)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def list_clients(db: Session):
    return db.query(Client).all()


def get_client_by_id(db: Session, client_id: int):
    return db.query(Client).filter(Client.id == client_id).first()


def update_client(db: Session, client_id: int, payload: dict):
    client = get_client_by_id(db, client_id)
    if not client:
        return None

    for key, value in payload.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client
