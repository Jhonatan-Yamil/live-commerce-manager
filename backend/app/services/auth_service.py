from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import verify_password, create_access_token, get_password_hash


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email, User.is_active == True).first()
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
    }


def create_user(db: Session, full_name: str, email: str, password: str, role):
    user = User(
        full_name=full_name,
        email=email,
        hashed_password=get_password_hash(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user