from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.schemas.user import UserCreate, UserOut
from app.services.auth_service import create_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=UserOut)
def register_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    return create_user(db, data.full_name, data.email, data.password, data.role)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).all()