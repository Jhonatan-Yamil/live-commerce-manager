from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.payment import Payment, PaymentStatus
from app.models.product import Product
from app.repositories import order_repository
from app.schemas.order import OrderCreate


def get_or_create_product(db: Session, name: str, price: Decimal) -> Product:
    product = order_repository.get_active_product_by_name(db, name)
    if not product:
        product = order_repository.create_product(db, name, price)
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