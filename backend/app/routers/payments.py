from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.payment import PaymentOut, PaymentStatusUpdate
from app.core.file_utils import save_uploaded_file
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


@router.get("/", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return list_payments_service(db, user_id=current_user.id)


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    p = get_payment_service(db, payment_id, user_id=current_user.id)
    return require_found(p, "Pago no encontrado")


@router.patch("/{payment_id}/status", response_model=PaymentOut)
def change_payment_status(payment_id: int, data: PaymentStatusUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    p = update_payment_status(db, payment_id, data.status, data.notes, user_id=current_user.id)
    return require_found(p, "Pago no encontrado")


@router.post("/order/{order_id}/voucher", response_model=PaymentOut)
def upload_voucher(
    order_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = get_payment_by_order_service(db, order_id, user_id=current_user.id)
    require_found(payment, "Pago no encontrado para este pedido")

    filename = save_uploaded_file(
        file=file,
        directory=UPLOAD_DIR,
        allowed_extensions={".jpg", ".jpeg", ".png", ".pdf"},
        filename_builder=lambda ext: f"voucher_order{order_id}_{int(datetime.now().timestamp())}{ext}",
        error_message="Solo se permiten imágenes JPG, PNG o PDF",
    )

    return register_voucher_service(db, order_id, filename, user_id=current_user.id)