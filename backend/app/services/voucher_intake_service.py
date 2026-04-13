import os
import shutil
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.repositories import payment_repository
from app.repositories import voucher_intake_repository
from app.services.ocr_service import extract_voucher_fields
from app.services.payment_service import register_voucher


UPLOAD_DIR = "uploads/intake"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
PENDING_ORDER_STATUSES = {
    OrderStatus.pending_payment,
    OrderStatus.payment_in_review,
    OrderStatus.payment_rejected,
}


def _validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Solo se permiten archivos JPG, PNG o PDF")
    return ext


def _normalize_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return "".join(ch for ch in phone if ch.isdigit())


def _phones_match(a: str | None, b: str | None) -> bool:
    na = _normalize_phone(a)
    nb = _normalize_phone(b)
    if not na or not nb:
        return False
    # Tolera formatos con/ sin prefijo de país
    return na.endswith(nb) or nb.endswith(na)


def _find_client_by_phone(db: Session, sender_phone: str | None) -> Client | None:
    if not sender_phone:
        return None
    clients = db.query(Client).all()
    for client in clients:
        if _phones_match(sender_phone, client.phone):
            return client
    return None


def _find_best_order_match(db: Session, client_id: int, extracted_amount) -> Order | None:
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

    # Si no hay exacto, no forzar match por monto distinto.
    return None


def _find_existing_auto_base(db: Session, client_id: int, extracted_amount) -> Order | None:
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


def _create_provisional_client(db: Session, intake) -> Client:
    provisional_name = (intake.extracted_sender_name or "Cliente provisional").strip()
    phone = intake.sender_phone.strip() if intake.sender_phone else None

    client = Client(
        full_name=provisional_name,
        phone=phone,
        notes="[PROVISIONAL] Creado automáticamente desde comprobante intake.",
    )
    db.add(client)
    db.flush()
    return client


def _create_base_order(db: Session, client_id: int, intake) -> Order:
    existing = _find_existing_auto_base(db, client_id, intake.extracted_amount)
    if existing:
        return existing

    total = Decimal(str(intake.extracted_amount)) if intake.extracted_amount is not None else Decimal("0")

    notes = "[AUTO_BASE] Pedido base generado por intake automático."
    if intake.extracted_reference:
        notes += f" Ref: {intake.extracted_reference}."

    order = Order(
        client_id=client_id,
        status=OrderStatus.pending_payment,
        total=total,
        notes=notes,
    )
    db.add(order)
    db.flush()

    payment = Payment(
        order_id=order.id,
        status=PaymentStatus.pending,
        voucher_path=f"/uploads/intake/{intake.file_path}",
        notes="Comprobante recibido por intake automático.",
    )
    db.add(payment)
    db.flush()

    return order


def create_intake_from_upload(
    db: Session,
    current_user: User,
    *,
    file,
    source_channel: VoucherSourceChannel = VoucherSourceChannel.manual,
    external_chat_id: str | None = None,
    external_message_id: str | None = None,
    sender_phone: str | None = None,
):
    ext = _validate_extension(file.filename)

    filename = f"intake_{source_channel.value}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ocr_fields = extract_voucher_fields(filepath)

    payload = {
        "source_channel": source_channel,
        "external_chat_id": external_chat_id,
        "external_message_id": external_message_id,
        "sender_phone": sender_phone,
        "file_path": filename,
        "mime_type": file.content_type,
        "match_status": VoucherMatchStatus.pending,
        "reviewed_by_user_id": None,
        "reviewed_at": None,
        "extracted_amount": ocr_fields.get("extracted_amount"),
        "extracted_date": ocr_fields.get("extracted_date"),
        "extracted_reference": ocr_fields.get("extracted_reference"),
        "extracted_sender_name": ocr_fields.get("extracted_sender_name"),
        "ocr_raw_text": ocr_fields.get("ocr_raw_text"),
        "ocr_confidence": ocr_fields.get("ocr_confidence"),
    }
    intake = voucher_intake_repository.create_intake(db, payload)
    return attempt_match_intake(db, intake.id)


def list_intakes(db: Session, status: VoucherMatchStatus | None = None, skip: int = 0, limit: int = 100):
    return voucher_intake_repository.list_intakes(db, status=status, skip=skip, limit=limit)


def get_intake(db: Session, intake_id: int):
    return voucher_intake_repository.get_by_id(db, intake_id)


def attempt_match_intake(db: Session, intake_id: int):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

    matched_client = _find_client_by_phone(db, intake.sender_phone)
    intake.matched_client_id = matched_client.id if matched_client else None

    if matched_client:
        matched_order = _find_best_order_match(db, matched_client.id, intake.extracted_amount)
        if matched_order:
            intake.matched_order_id = matched_order.id
            intake.created_order_id = None
            intake.match_status = VoucherMatchStatus.suggested
        else:
            created_order = _create_base_order(db, matched_client.id, intake)
            intake.created_order_id = created_order.id
            intake.matched_order_id = created_order.id
            intake.match_status = VoucherMatchStatus.suggested
    else:
        provisional_client = _create_provisional_client(db, intake)
        created_order = _create_base_order(db, provisional_client.id, intake)

        intake.matched_client_id = provisional_client.id
        intake.created_order_id = created_order.id
        intake.matched_order_id = created_order.id
        intake.match_status = VoucherMatchStatus.suggested

    intake.reviewed_by_user_id = None
    intake.reviewed_at = None
    return voucher_intake_repository.save(db, intake)


def confirm_intake_match(db: Session, intake_id: int, current_user: User):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None
    if not intake.matched_order_id:
        raise ValueError("No hay pedido sugerido para confirmar")

    payment = payment_repository.get_by_order_id(db, intake.matched_order_id)
    if not payment:
        raise ValueError("El pedido no tiene registro de pago")

    voucher_public_path = f"/uploads/intake/{intake.file_path}"
    register_voucher(db, intake.matched_order_id, voucher_public_path)

    intake.match_status = VoucherMatchStatus.confirmed
    intake.reviewed_by_user_id = current_user.id
    intake.reviewed_at = datetime.now(timezone.utc)
    return voucher_intake_repository.save(db, intake)


def reject_intake_match(db: Session, intake_id: int, current_user: User):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None
    intake.match_status = VoucherMatchStatus.rejected
    intake.reviewed_by_user_id = current_user.id
    intake.reviewed_at = datetime.now(timezone.utc)
    return voucher_intake_repository.save(db, intake)


def reassign_intake_match(db: Session, intake_id: int, order_id: int, current_user: User):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Pedido no encontrado")

    intake.matched_order_id = order.id
    intake.matched_client_id = order.client_id

    payment = payment_repository.get_by_order_id(db, order.id)
    if not payment:
        raise ValueError("El pedido no tiene registro de pago")

    voucher_public_path = f"/uploads/intake/{intake.file_path}"
    register_voucher(db, order.id, voucher_public_path)

    intake.match_status = VoucherMatchStatus.confirmed
    intake.reviewed_by_user_id = current_user.id
    intake.reviewed_at = datetime.now(timezone.utc)
    return voucher_intake_repository.save(db, intake)
