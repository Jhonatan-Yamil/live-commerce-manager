from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.repositories.crud_utils import create_entity, get_entity_by_id, list_entities, update_entity, scoped_query


def create_product(db: Session, payload: dict):
    return create_entity(db, Product, payload)


def list_active_products(db: Session, user_id: int | None = None):
    q = scoped_query(db, Product, user_id=user_id)
    return q.filter(Product.is_active == True).all()


def list_product_names(db: Session, user_id: int | None = None):
    products = list_active_products(db, user_id=user_id)
    return [{"id": p.id, "name": p.name} for p in products]



def get_product_by_id(db: Session, product_id: int, user_id: int | None = None):
    q = scoped_query(db, Product, user_id=user_id)
    return q.filter(Product.id == product_id).first()


def update_product(db: Session, product_id: int, payload: dict, user_id: int | None = None):
    product = get_product_by_id(db, product_id, user_id=user_id)
    return update_entity(db, product, payload)


def list_sales_rows(db: Session, user_id: int | None = None):
    q = (
        db.query(OrderItem, Product, Lot)
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .outerjoin(Lot, Lot.id == OrderItem.lot_id)
        .filter(Order.status == OrderStatus.payment_confirmed)
    )
    if user_id is not None:
        q = q.filter(Order.user_id == user_id)
    return q.all()
