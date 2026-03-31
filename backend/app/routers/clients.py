from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut
from app.services.client_service import (
    create_client as create_client_service,
    get_client as get_client_service,
    list_clients as list_clients_service,
    update_client as update_client_service,
)

router = APIRouter()


@router.post("/", response_model=ClientOut)
def create_client(data: ClientCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_client_service(db, data.model_dump())


@router.get("/", response_model=list[ClientOut])
def list_clients(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_clients_service(db)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = get_client_service(db, client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = update_client_service(db, client_id, data.model_dump(exclude_unset=True))
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c