from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.payment import PaymentOut, PaymentStatusUpdate
from app.models.payment import Payment
from app.services.payment_service import update_payment_status, register_voucher

router = APIRouter()


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


@router.patch("/order/{order_id}/voucher", response_model=PaymentOut)
def upload_voucher(order_id: int, voucher_path: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = register_voucher(db, order_id, voucher_path)
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado para este pedido")
    return p