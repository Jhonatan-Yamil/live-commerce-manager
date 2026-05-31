from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.services.cash_flow_service import calculate_cash_flow

router = APIRouter()


@router.get("/")
def get_cash_flow(
    date_from: str = Query(..., description="Fecha desde (YYYY-MM-DD)"),
    date_to: str = Query(..., description="Fecha hasta (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        return calculate_cash_flow(db, date_from, date_to, user_id=current_user.id)
    except ValueError:
        return {"error": "Formato de fecha inválido. Usar YYYY-MM-DD"}
