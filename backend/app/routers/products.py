from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.models.product import Product
from sqlalchemy import func
from app.models.order import OrderItem


router = APIRouter()


@router.post("/", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = Product(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Product).filter(Product.is_active == True).all()

@router.get("/sold", response_model=list[dict])
def get_sold_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    items = db.query(OrderItem).all()
    product_map = {}
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
        key = product.id
        if key not in product_map:
            product_map[key] = {
                "product_id": product.id,
                "name": product.name,
                "units_sold": 0,
                "total_revenue": 0,
                "orders_count": set(),
                "lots": {},
            }
        product_map[key]["units_sold"] += item.quantity
        product_map[key]["total_revenue"] += float(item.subtotal)
        product_map[key]["orders_count"].add(item.order_id)
        if item.lot_id:
            from app.models.lot import Lot
            lot = db.query(Lot).filter(Lot.id == item.lot_id).first()
            if lot:
                lot_key = lot.id
                if lot_key not in product_map[key]["lots"]:
                    product_map[key]["lots"][lot_key] = {
                        "lot_id": lot.id,
                        "lot_name": lot.name,
                        "brand": lot.brand,
                        "units_sold": 0,
                        "revenue": 0,
                    }
                product_map[key]["lots"][lot_key]["units_sold"] += item.quantity
                product_map[key]["lots"][lot_key]["revenue"] += float(item.subtotal)

    result = []
    for p in product_map.values():
        result.append({
            "product_id": p["product_id"],
            "name": p["name"],
            "units_sold": p["units_sold"],
            "total_revenue": round(p["total_revenue"], 2),
            "orders_count": len(p["orders_count"]),
            "avg_price": round(p["total_revenue"] / p["units_sold"], 2) if p["units_sold"] > 0 else 0,
            "lots": list(p["lots"].values()),
        })

    result.sort(key=lambda x: x["total_revenue"], reverse=True)
    return result

@router.get("/names")
def get_product_names(db: Session = Depends(get_db), _=Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_active == True).all()
    return [{"id": p.id, "name": p.name} for p in products]

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p