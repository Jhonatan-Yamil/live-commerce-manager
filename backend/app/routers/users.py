import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.core.file_utils import save_uploaded_file
from app.core.security import get_password_hash, verify_password
from app.schemas.user import UserCreate, UserOut, UserPasswordUpdateIn, UserProfileUpdateIn
from app.services.user_service import list_users as list_users_service, register_user as register_user_service
from app.models.user import User

router = APIRouter()
UPLOAD_DIR = os.path.join("uploads", "store_logos")


@router.post("/", response_model=UserOut)
def register_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = register_user_service(db, data.full_name, data.email, data.password, data.role)
    if not user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    return user

# 1
@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/profile", response_model=UserOut)
def update_my_profile(
    data: UserProfileUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    next_name = (data.full_name or "").strip()
    if not next_name:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")

    current_user.full_name = next_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password")
def update_my_password(
    data: UserPasswordUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    if len(data.new_password or "") < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    if verify_password(data.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser diferente a la actual")

    current_user.hashed_password = get_password_hash(data.new_password)
    db.add(current_user)
    db.commit()
    return {"ok": True}


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return list_users_service(db)


@router.post("/me/logo", response_model=UserOut)
def upload_my_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = save_uploaded_file(
        file=file,
        directory=UPLOAD_DIR,
        allowed_extensions={".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"},
        filename_builder=lambda ext: f"store_{current_user.id}_{int(datetime.now().timestamp())}{ext}",
        error_message="Solo se permiten imágenes JPG, PNG, WEBP, GIF o SVG",
    )

    current_user.logo_path = f"/uploads/store_logos/{filename}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user