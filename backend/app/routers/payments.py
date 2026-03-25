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
@router.get("/", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.order import Order
    from app.models.client import Client
    payments = db.query(Payment).all()
    result = []
    for p in payments:
        order = db.query(Order).filter(Order.id == p.order_id).first()
        client = db.query(Client).filter(Client.id == order.client_id).first() if order else None
        result.append(PaymentOut(
            id=p.id,
            order_id=p.order_id,
            status=p.status,
            voucher_path=p.voucher_path,
            notes=p.notes,
            reviewed_at=p.reviewed_at,
            created_at=p.created_at,
            client_name=client.full_name if client else None,
            order_created_at=order.created_at if order else None,
            order_total=float(order.total) if order else None,
        ))
    return result


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