from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.order import OrderItem
from app.models.product import Product


def create_product(db: Session, payload: dict):
    product = Product(**payload)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def list_active_products(db: Session):
    return db.query(Product).filter(Product.is_active == True).all()


def list_product_names(db: Session):
    products = list_active_products(db)
    return [{"id": p.id, "name": p.name} for p in products]


def get_product_by_id(db: Session, product_id: int):
    return db.query(Product).filter(Product.id == product_id).first()


def update_product(db: Session, product_id: int, payload: dict):
    product = get_product_by_id(db, product_id)
    if not product:
        return None

    for key, value in payload.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def list_sales_rows(db: Session):
    return (
        db.query(OrderItem, Product, Lot)
        .join(Product, Product.id == OrderItem.product_id)
        .outerjoin(Lot, Lot.id == OrderItem.lot_id)
        .all()
    )
