import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.payment import PaymentOut, PaymentStatusUpdate
from app.services.payment_service import (
    get_payment as get_payment_service,
    get_payment_by_order as get_payment_by_order_service,
    list_payments as list_payments_service,
    register_voucher as register_voucher_service,
    update_payment_status,
)
from app.routers.utils import require_found

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_payments_service(db)


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = get_payment_service(db, payment_id)
    return require_found(p, "Pago no encontrado")


@router.patch("/{payment_id}/status", response_model=PaymentOut)
def change_payment_status(payment_id: int, data: PaymentStatusUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = update_payment_status(db, payment_id, data.status, data.notes)
    return require_found(p, "Pago no encontrado")


@router.post("/order/{order_id}/voucher", response_model=PaymentOut)
def upload_voucher(
    order_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    payment = get_payment_by_order_service(db, order_id)
    require_found(payment, "Pago no encontrado para este pedido")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG o PDF")

    filename = f"voucher_order{order_id}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return register_voucher_service(db, order_id, filename)