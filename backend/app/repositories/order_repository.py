from sqlalchemy.orm import Session, joinedload

from app.models.order import Order
from app.models.product import Product


def get_active_product_by_name(db: Session, name: str):
    return (
        db.query(Product)
        .filter(Product.name == name, Product.is_active == True)
        .first()
    )


def create_product(db: Session, name: str, price):
    product = Product(name=name, price=price, stock=0)
    db.add(product)
    db.flush()
    return product


def list_orders(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Order)
        .options(joinedload(Order.client), joinedload(Order.items))
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_order_by_id(db: Session, order_id: int):
    return (
        db.query(Order)
        .options(
            joinedload(Order.client),
            joinedload(Order.items),
            joinedload(Order.payment),
            joinedload(Order.logistics),
        )
        .filter(Order.id == order_id)
        .first()
    )


def get_order_for_update(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()
