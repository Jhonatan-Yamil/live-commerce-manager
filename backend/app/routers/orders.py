from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.services.order_service import create_order, get_orders, get_order, update_order_status

router = APIRouter()


@router.post("/", response_model=OrderOut)
def new_order(data: OrderCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_order(db, data)


@router.get("/", response_model=list[OrderOut])
def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_orders(db, skip, limit)


@router.get("/{order_id}", response_model=OrderOut)
def detail_order(order_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    o = get_order(db, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return o


@router.patch("/{order_id}/status")
def change_order_status(order_id: int, data: OrderStatusUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    o = update_order_status(db, order_id, data.status)
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"message": "Estado actualizado", "status": o.status}