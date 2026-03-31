from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.logistics import LogisticsCreate, LogisticsUpdate, LogisticsOut
from app.services.logistics_service import (
    create_logistics as create_logistics_service,
    get_logistics as get_logistics_service,
    list_logistics as list_logistics_service,
    update_logistics as update_logistics_service,
)

router = APIRouter()


@router.post("/", response_model=LogisticsOut)
def create_logistics(data: LogisticsCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    logistics = create_logistics_service(db, data.model_dump())
    if not logistics:
        raise HTTPException(status_code=400, detail="Logística ya existe para este pedido")
    return logistics


@router.get("/", response_model=list[LogisticsOut])
def list_logistics(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_logistics_service(db)


@router.get("/{logistics_id}", response_model=LogisticsOut)
def get_logistics(logistics_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = get_logistics_service(db, logistics_id)
    if not l:
        raise HTTPException(status_code=404, detail="No encontrado")
    return l


@router.put("/{logistics_id}", response_model=LogisticsOut)
def update_logistics(logistics_id: int, data: LogisticsUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = update_logistics_service(db, logistics_id, data.model_dump(exclude_unset=True))
    if not l:
        raise HTTPException(status_code=404, detail="No encontrado")
    return l