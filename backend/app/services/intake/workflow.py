from __future__ import annotations

from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.client import Client
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.repositories import payment_repository
from app.repositories import voucher_intake_repository
from app.services.intake_queue_service import enqueue_intake_processing
from app.services.payment_service import register_voucher, update_payment_status


def build_pending_intake_payload(
    *,
    source_channel: VoucherSourceChannel,
    external_chat_id: str | None,
    external_message_id: str | None,
    sender_phone: str | None,
    filename: str,
    mime_type: str | None,
    file_sha256: str,
    file_size_bytes: int,
) -> dict:
    return {
        "source_channel": source_channel,
        "external_chat_id": external_chat_id,
        "external_message_id": external_message_id,
        "sender_phone": sender_phone,
        "file_path": filename,
        "mime_type": mime_type,
        "file_sha256": file_sha256,
        "file_size_bytes": file_size_bytes,
        "match_status": VoucherMatchStatus.pending,
        "reviewed_by_user_id": None,
        "reviewed_at": None,
        "processing_status": "queued",
        "processing_error": None,
        "processing_started_at": None,
        "processing_finished_at": None,
        "processing_attempts": 0,
        "extracted_amount": None,
        "extracted_date": None,
        "extracted_reference": None,
        "extracted_sender_name": None,
        "ocr_raw_text": "[PENDING_PROCESSING]",
        "ocr_confidence": None,
    }


def create_provisional_client(db: Session, intake) -> Client:
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


def create_base_order(db: Session, client_id: int, intake) -> Order:
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    existing = (
        db.query(Order)
        .filter(
            Order.client_id == client_id,
            Order.status == OrderStatus.pending_payment,
            Order.notes.ilike("%[AUTO_BASE]%"),
            Order.created_at >= since,
        )
        .order_by(Order.id.desc())
        .first()
    )
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


def dispatch_intake_processing(db: Session, intake):
    if settings.INTAKE_ASYNC_ENABLED:
        enqueue_intake_processing(intake.id)
        return intake

    from app.services.intake_processing_service import process_intake_job

    process_intake_job(intake.id)
    refreshed = voucher_intake_repository.get_by_id(db, intake.id)
    return refreshed or intake


def reset_intake_for_reprocess(intake) -> None:
    intake.extracted_amount = None
    intake.extracted_date = None
    intake.extracted_reference = None
    intake.extracted_sender_name = None
    intake.ocr_raw_text = "[PENDING_PROCESSING]"
    intake.ocr_confidence = None
    intake.processing_status = "queued"
    intake.processing_error = None
    intake.processing_started_at = None
    intake.processing_finished_at = None
    intake.processing_attempts = (intake.processing_attempts or 0) + 1
    intake.match_status = VoucherMatchStatus.pending
    intake.reviewed_by_user_id = None
    intake.reviewed_at = None


def register_and_confirm_payment(db: Session, order_id: int, intake, *, note: str) -> None:
    payment = payment_repository.get_by_order_id(db, order_id)
    if not payment:
        raise ValueError("El pedido no tiene registro de pago")

    voucher_public_path = f"/uploads/intake/{intake.file_path}"
    register_voucher(db, order_id, voucher_public_path)
    update_payment_status(db, payment.id, PaymentStatus.confirmed, notes=note)


def mark_reviewed(intake, *, status: VoucherMatchStatus, current_user: User) -> None:
    intake.match_status = status
    intake.reviewed_by_user_id = current_user.id
    intake.reviewed_at = datetime.now(timezone.utc)