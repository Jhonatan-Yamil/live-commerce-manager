from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session, joinedload

from app.models.order import Order
from app.models.lot import Lot
from app.models.payment import Payment


BOL_TZ = timezone(timedelta(hours=-4))


def calculate_cash_flow(db: Session, date_from: str, date_to: str, user_id: int | None = None) -> dict:
    from_date = datetime.strptime(date_from, "%Y-%m-%d").replace(
        hour=0, minute=0, second=0, tzinfo=BOL_TZ
    )
    to_date = datetime.strptime(date_to, "%Y-%m-%d").replace(
        hour=23, minute=59, second=59, tzinfo=BOL_TZ
    )

    q_payments = (
        db.query(Payment)
        .options(joinedload(Payment.order).joinedload(Order.client))
        .filter(
            Payment.status == "confirmed",
            Payment.reviewed_at.isnot(None),
            Payment.reviewed_at >= from_date,
            Payment.reviewed_at <= to_date,
        )
    )
    if user_id is not None:
        q_payments = q_payments.join(Order, Payment.order_id == Order.id).filter(Order.user_id == user_id)
    confirmed_payments = q_payments.all()

    q_lots = db.query(Lot).filter(
        Lot.created_at >= from_date,
        Lot.created_at <= to_date,
    )
    if user_id is not None:
        q_lots = q_lots.filter(Lot.user_id == user_id)
    purchased_lots = q_lots.all()

    transactions = []

    for payment in confirmed_payments:
        amount = float(
            getattr(payment, "amount", None)
            or (payment.order.total if payment.order else 0)
            or 0
        )
        if amount > 0:
            reviewed_local = payment.reviewed_at.astimezone(BOL_TZ)
            client_name = payment.order.client.full_name if payment.order and payment.order.client else "Sin cliente"
            transactions.append(
                {
                    "date": reviewed_local.strftime("%Y-%m-%d"),
                    "description": f"Pedido #{payment.order_id} - {client_name}",
                    "type": "income",
                    "amount": amount,
                    "balance": 0,
                }
            )

    for lot in purchased_lots:
        amount = float(lot.total_cost or 0)
        if amount > 0:
            created_local = lot.created_at.astimezone(BOL_TZ)
            transactions.append(
                {
                    "date": created_local.strftime("%Y-%m-%d"),
                    "description": f"Lote #{lot.id} ({lot.name or 'Sin nombre'})",
                    "type": "expense",
                    "amount": amount,
                    "balance": 0,
                }
            )

    transactions.sort(key=lambda x: x["date"])

    running_balance = 0.0
    for transaction in transactions:
        if transaction["type"] == "income":
            running_balance += transaction["amount"]
        else:
            running_balance -= transaction["amount"]
        transaction["balance"] = round(running_balance, 2)

    total_income = sum(transaction["amount"] for transaction in transactions if transaction["type"] == "income")
    total_expenses = sum(transaction["amount"] for transaction in transactions if transaction["type"] == "expense")

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net": round(total_income - total_expenses, 2),
        "period": {"from": date_from, "to": date_to},
        "details": transactions,
    }