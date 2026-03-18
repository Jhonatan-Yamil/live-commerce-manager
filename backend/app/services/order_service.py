from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.product import Product
from app.schemas.order import OrderCreate


def get_or_create_product(db: Session, name: str, price: Decimal) -> Product:
    product = db.query(Product).filter(
        Product.name == name,
        Product.is_active == True
    ).first()
    if not product:
        product = Product(name=name, price=price, stock=0)
        db.add(product)
        db.flush()
    return product


def create_order(db: Session, data: OrderCreate) -> Order:
    order = Order(client_id=data.client_id, notes=data.notes)
    db.add(order)
    db.flush()
    total = Decimal("0")
    for item_data in data.items:
        product = get_or_create_product(db, item_data.product_name, item_data.unit_price)
        subtotal = item_data.unit_price * item_data.quantity
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            lot_id=item_data.lot_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            subtotal=subtotal,
        )
        db.add(item)
        total += subtotal
    order.total = total
    payment = Payment(order_id=order.id, status=PaymentStatus.pending)
    db.add(payment)
    db.commit()
    db.refresh(order)
    return order


def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Order)
        .options(
            joinedload(Order.client),
            joinedload(Order.items),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_order(db: Session, order_id: int):
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


def update_order_status(db: Session, order_id: int, status: OrderStatus):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.status = status
        db.commit()
        db.refresh(order)
    return order