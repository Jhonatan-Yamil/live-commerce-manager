from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.order import OrderItem
from app.models.product import Product
from app.repositories.crud_utils import create_entity, get_entity_by_id, list_entities, update_entity


def create_product(db: Session, payload: dict):
    return create_entity(db, Product, payload)


def list_active_products(db: Session):
    return list_entities(db, Product, Product.is_active == True)


def list_product_names(db: Session):
    products = list_active_products(db)
    return [{"id": p.id, "name": p.name} for p in products]


def get_product_by_id(db: Session, product_id: int):
    return get_entity_by_id(db, Product, product_id)


def update_product(db: Session, product_id: int, payload: dict):
    product = get_product_by_id(db, product_id)
    return update_entity(db, product, payload)


def list_sales_rows(db: Session):
    return (
        db.query(OrderItem, Product, Lot)
        .join(Product, Product.id == OrderItem.product_id)
        .outerjoin(Lot, Lot.id == OrderItem.lot_id)
        .all()
    )
