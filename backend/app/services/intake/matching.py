from __future__ import annotations

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import unicodedata

from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.order import Order, OrderStatus


PENDING_ORDER_STATUSES = {
    OrderStatus.pending_payment,
    OrderStatus.payment_in_review,
    OrderStatus.payment_rejected,
}


def normalize_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return "".join(ch for ch in phone if ch.isdigit())


def phones_match(a: str | None, b: str | None) -> bool:
    na = normalize_phone(a)
    nb = normalize_phone(b)
    if not na or not nb:
        return False
    return na.endswith(nb) or nb.endswith(na)


def normalize_name_tokens(value: str | None) -> list[str]:
    if not value:
        return []
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()
    cleaned = "".join(ch if (ch.isalnum() or ch.isspace()) else " " for ch in normalized)
    tokens = [t for t in cleaned.split() if len(t) > 1]
    stopwords = {"de", "del", "la", "el", "cuenta", "origen", "destino", "banco"}
    return [t for t in tokens if t not in stopwords]


def name_similarity(a: str | None, b: str | None) -> float:
    ta = set(normalize_name_tokens(a))
    tb = set(normalize_name_tokens(b))
    if not ta or not tb:
        return 0.0
    shared = len(ta.intersection(tb))
    if shared == 0:
        return 0.0

    smaller = min(len(ta), len(tb))
    larger = max(len(ta), len(tb))
    coverage = shared / smaller
    overlap = shared / larger

    if shared >= 2:
        return max(coverage * 0.8, overlap)

    if smaller == 1:
        return overlap * 0.6

    return 0.0


def find_client_by_phone(db: Session, sender_phone: str | None) -> Client | None:
    if not sender_phone:
        return None
    clients = db.query(Client).all()
    for client in clients:
        if phones_match(sender_phone, client.phone):
            return client
    return None


def find_client_by_name(db: Session, sender_name: str | None) -> Client | None:
    if not sender_name:
        return None
    clients = db.query(Client).all()
    best_client = None
    best_score = 0.0
    for client in clients:
        score = name_similarity(sender_name, client.full_name)
        if score > best_score:
            best_score = score
            best_client = client

    return best_client if best_score >= 0.45 else None


def find_best_order_match(db: Session, client_id: int, extracted_amount) -> Order | None:
    orders = (
        db.query(Order)
        .filter(Order.client_id == client_id, Order.status.in_(PENDING_ORDER_STATUSES))
        .order_by(Order.id.desc())
        .all()
    )
    if not orders:
        return None

    if extracted_amount is None:
        return orders[0]

    target = Decimal(str(extracted_amount))
    exact = [o for o in orders if abs(Decimal(str(o.total)) - target) <= Decimal("0.01")]
    if exact:
        return exact[0]

    return None


def find_existing_auto_base(db: Session, client_id: int, extracted_amount) -> Order | None:
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    q = (
        db.query(Order)
        .filter(
            Order.client_id == client_id,
            Order.status == OrderStatus.pending_payment,
            Order.notes.ilike("%[AUTO_BASE]%"),
            Order.created_at >= since,
        )
        .order_by(Order.id.desc())
    )

    if extracted_amount is not None:
        target = Decimal(str(extracted_amount))
        orders = q.all()
        for o in orders:
            if abs(Decimal(str(o.total)) - target) <= Decimal("0.01"):
                return o
        return None

    return q.first()
