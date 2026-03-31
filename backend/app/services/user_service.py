from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.repositories import user_repository


def register_user(db: Session, full_name: str, email: str, password: str, role):
    if user_repository.get_by_email(db, email):
        return None

    return user_repository.create_user(
        db,
        {
            "full_name": full_name,
            "email": email,
            "hashed_password": get_password_hash(password),
            "role": role,
        },
    )


def list_users(db: Session):
    return user_repository.list_users(db)
