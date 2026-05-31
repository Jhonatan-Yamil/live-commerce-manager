from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.lot import LotCreate, LotUpdate, LotOut
from app.services.lot_service import (
    create_lot,
    format_lot_with_stats,
    get_lot as get_lot_service,
    get_lots_with_stats,
    update_lot,
)
from app.routers.utils import require_found

router = APIRouter()


@router.post("/", response_model=LotOut)
def new_lot(data: LotCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lot = create_lot(db, data, user_id=current_user.id)
    # assign owner for returned representation
    return format_lot_with_stats(db, lot, user_id=current_user.id)

@router.get("/", response_model=list[LotOut])
def list_lots(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return get_lots_with_stats(db, user_id=current_user.id)


@router.get("/{lot_id}", response_model=LotOut)
def get_lot(lot_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lot = get_lot_service(db, lot_id, user_id=current_user.id)
    lot = require_found(lot, "Lote no encontrado")
    return format_lot_with_stats(db, lot, user_id=current_user.id)


@router.put("/{lot_id}", response_model=LotOut)
def edit_lot(lot_id: int, data: LotUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lot = update_lot(db, lot_id, data, user_id=current_user.id)
    lot = require_found(lot, "Lote no encontrado")
    return format_lot_with_stats(db, lot, user_id=current_user.id)