from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.services.product_service import (
    create_product as create_product_service,
    get_product as get_product_service,
    list_product_names as list_product_names_service,
    list_products as list_products_service,
    list_sold_products as list_sold_products_service,
    update_product as update_product_service,
)


router = APIRouter()


@router.post("/", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_product_service(db, data.model_dump())


@router.get("/", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_products_service(db)

@router.get("/sold", response_model=list[dict])
def get_sold_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_sold_products_service(db)

@router.get("/names")
def get_product_names(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list_product_names_service(db)

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = get_product_service(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = update_product_service(db, product_id, data.model_dump(exclude_unset=True))
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p