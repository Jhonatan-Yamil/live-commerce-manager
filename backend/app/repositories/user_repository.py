from sqlalchemy.orm import Session

from app.models.user import User


def get_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_active_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email, User.is_active == True).first()


def create_user(db: Session, payload: dict):
    user = User(**payload)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session):
    return db.query(User).all()
