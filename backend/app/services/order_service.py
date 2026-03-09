from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.order import OrderCreate


def create_order(db: Session, data: OrderCreate) -> Order:
    order = Order(client_id=data.client_id, notes=data.notes)
    db.add(order)
    db.flush()
    total = Decimal("0")
    for item_data in data.items:
        subtotal = item_data.unit_price * item_data.quantity
        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
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