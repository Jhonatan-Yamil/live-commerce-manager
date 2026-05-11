from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone, timedelta
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.payment import Payment
from app.models.lot import Lot

router = APIRouter()

BOL_TZ = timezone(timedelta(hours=-4))


@router.get("/")
def get_cash_flow(
    date_from: str = Query(..., description="Fecha desde (YYYY-MM-DD)"),
    date_to: str = Query(..., description="Fecha hasta (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        from_date = datetime.strptime(date_from, "%Y-%m-%d").replace(
            hour=0, minute=0, second=0, tzinfo=BOL_TZ
        )
        to_date = datetime.strptime(date_to, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=BOL_TZ
        )
    except ValueError:
        return {"error": "Formato de fecha inválido. Usar YYYY-MM-DD"}

    confirmed_payments = db.query(Payment).options(
        joinedload(Payment.order)
    ).filter(
        Payment.status == "confirmed",
        Payment.reviewed_at.isnot(None),
        Payment.reviewed_at >= from_date,
        Payment.reviewed_at <= to_date,
    ).all()

    purchased_lots = db.query(Lot).filter(
        Lot.created_at >= from_date,
        Lot.created_at <= to_date,
    ).all()

    transactions = []

    for payment in confirmed_payments:
        amount = float(
            getattr(payment, "amount", None)
            or (payment.order.total if payment.order else 0)
            or 0
        )
        if amount > 0:
            reviewed_local = payment.reviewed_at.astimezone(BOL_TZ)
            transactions.append({
                "date": reviewed_local.strftime("%Y-%m-%d"),
                "description": f"Ingreso — Pago Pedido #{payment.order_id}",
                "type": "income",
                "amount": amount,
                "balance": 0,
            })

    for lot in purchased_lots:
        amount = float(lot.total_cost or 0)
        if amount > 0:
            created_local = lot.created_at.astimezone(BOL_TZ)
            transactions.append({
                "date": created_local.strftime("%Y-%m-%d"),
                "description": f"Egreso — Lote #{lot.id} ({lot.name or 'Sin nombre'})",
                "type": "expense",
                "amount": amount,
                "balance": 0,
            })

    transactions.sort(key=lambda x: x["date"])

    running_balance = 0.0
    for t in transactions:
        if t["type"] == "income":
            running_balance += t["amount"]
        else:
            running_balance -= t["amount"]
        t["balance"] = round(running_balance, 2)

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net": round(total_income - total_expenses, 2),
        "period": {"from": date_from, "to": date_to},
        "details": transactions,
    }