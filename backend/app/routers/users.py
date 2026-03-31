from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.schemas.user import UserCreate, UserOut
from app.services.user_service import list_users as list_users_service, register_user as register_user_service
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=UserOut)
def register_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = register_user_service(db, data.full_name, data.email, data.password, data.role)
    if not user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return list_users_service(db)