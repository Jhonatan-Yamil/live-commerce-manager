from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.lot import LotCreate, LotUpdate, LotOut
from app.models.lot import Lot
from app.services.lot_service import create_lot, update_lot, get_lots_with_stats

router = APIRouter()


@router.post("/", response_model=LotOut)
def new_lot(data: LotCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    lot = create_lot(db, data)
    return LotOut(
        id=lot.id,
        name=lot.name,
        brand=lot.brand,
        total_units=lot.total_units,
        total_cost=lot.total_cost,
        unit_cost=lot.unit_cost,
        notes=lot.notes,
        created_at=lot.created_at,
        units_sold=0,
        total_revenue=Decimal("0"),
        profit=-lot.total_cost,
        units_remaining=lot.total_units,
    )

@router.get("/", response_model=list[LotOut])
def list_lots(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_lots_with_stats(db)


@router.get("/{lot_id}", response_model=LotOut)
def get_lot(lot_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return lot


@router.put("/{lot_id}", response_model=LotOut)
def edit_lot(lot_id: int, data: LotUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    lot = update_lot(db, lot_id, data)
    if not lot:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return lot