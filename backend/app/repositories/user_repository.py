from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.crud_utils import create_entity, list_entities


def get_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_active_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email, User.is_active == True).first()


def get_by_whatsapp_instance_name(db: Session, instance_name: str):
    normalized = (instance_name or "").strip().lower()
    if not normalized:
        return None
    return (
        db.query(User)
        .filter(User.whatsapp_instance_name.isnot(None))
        .filter(func.lower(User.whatsapp_instance_name) == normalized)
        .first()
    )


def create_user(db: Session, payload: dict):
    return create_entity(db, User, payload)


def list_users(db: Session):
    return list_entities(db, User)
