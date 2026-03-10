from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.logistics import LogisticsCreate, LogisticsUpdate, LogisticsOut
from app.models.logistics import Logistics

router = APIRouter()


@router.post("/", response_model=LogisticsOut)
def create_logistics(data: LogisticsCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    existing = db.query(Logistics).filter(Logistics.order_id == data.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Logística ya existe para este pedido")
    l = Logistics(**data.model_dump())
    db.add(l)
    db.commit()
    db.refresh(l)
    return l


@router.get("/", response_model=list[LogisticsOut])
def list_logistics(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Logistics).all()


@router.get("/{logistics_id}", response_model=LogisticsOut)
def get_logistics(logistics_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Logistics).filter(Logistics.id == logistics_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="No encontrado")
    return l


@router.put("/{logistics_id}", response_model=LogisticsOut)
def update_logistics(logistics_id: int, data: LogisticsUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Logistics).filter(Logistics.id == logistics_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(l, k, v)
    db.commit()
    db.refresh(l)
    return l