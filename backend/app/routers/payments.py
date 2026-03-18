import os
import shutil
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.payment import PaymentOut, PaymentStatusUpdate
from app.models.payment import Payment
from app.services.payment_service import update_payment_status

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Payment).all()


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return p


@router.patch("/{payment_id}/status", response_model=PaymentOut)
def change_payment_status(payment_id: int, data: PaymentStatusUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = update_payment_status(db, payment_id, data.status, data.notes)
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return p


@router.post("/order/{order_id}/voucher", response_model=PaymentOut)
def upload_voucher(
    order_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado para este pedido")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG o PDF")

    filename = f"voucher_order{order_id}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    from app.models.order import Order, OrderStatus
    payment.voucher_path = filename
    payment.status = __import__('app.models.payment', fromlist=['PaymentStatus']).PaymentStatus.in_review
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.status = OrderStatus.payment_in_review
    db.commit()
    db.refresh(payment)
    return payment