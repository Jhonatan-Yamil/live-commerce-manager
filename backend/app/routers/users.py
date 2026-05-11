import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.schemas.user import UserCreate, UserOut
from app.services.user_service import list_users as list_users_service, register_user as register_user_service
from app.models.user import User

router = APIRouter()
UPLOAD_DIR = os.path.join("uploads", "store_logos")
os.makedirs(UPLOAD_DIR, exist_ok=True)


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


@router.post("/me/logo", response_model=UserOut)
def upload_my_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG, WEBP, GIF o SVG")

    filename = f"store_{current_user.id}_{int(datetime.now().timestamp())}{extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
      shutil.copyfileobj(file.file, buffer)

    current_user.logo_path = f"/uploads/store_logos/{filename}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user