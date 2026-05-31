from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import verify_password, create_access_token, get_password_hash
from app.repositories import user_repository


def authenticate_user(db: Session, email: str, password: str):
    user = user_repository.get_active_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_token_for_user(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name,
        "logo_path": user.logo_path,
        "whatsapp_instance_name": user.whatsapp_instance_name,
        "whatsapp_instance_status": user.whatsapp_instance_status,
        "whatsapp_connected_at": user.whatsapp_connected_at,
        "whatsapp_intake_enabled": user.whatsapp_intake_enabled,
    }


def create_user(db: Session, full_name: str, email: str, password: str, role):
    return user_repository.create_user(
        db,
        {
            "full_name": full_name,
            "email": email,
            "hashed_password": get_password_hash(password),
            "role": role,
        },
    )