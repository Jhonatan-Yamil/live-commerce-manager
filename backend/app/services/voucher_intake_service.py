import os
import hashlib
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import unicodedata
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.core.config import settings
from app.repositories import payment_repository
from app.repositories import voucher_intake_repository
from app.services.intake_queue_service import enqueue_intake_processing
from app.services.payment_service import register_voucher, update_payment_status


UPLOAD_DIR = "uploads/intake"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
}
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


def _validate_mime_type(mime_type: str | None) -> None:
    if not mime_type:
        return
    if mime_type.lower() not in ALLOWED_MIME_TYPES:
        raise ValueError("Tipo de archivo no permitido")


def _read_upload_bytes(file) -> bytes:
    content = file.file.read()
    file.file.seek(0)
    return content


def _validate_file_size(content: bytes) -> None:
    max_bytes = settings.INTAKE_MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError(f"Archivo demasiado grande. Máximo {settings.INTAKE_MAX_FILE_SIZE_MB}MB")


def _compute_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


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


def _normalize_name_tokens(value: str | None) -> list[str]:
    if not value:
        return []
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()
    cleaned = "".join(ch if (ch.isalnum() or ch.isspace()) else " " for ch in normalized)
    tokens = [t for t in cleaned.split() if len(t) > 1]
    # Quita ruido común en comprobantes.
    stopwords = {"de", "del", "la", "el", "cuenta", "origen", "destino", "banco"}
    return [t for t in tokens if t not in stopwords]


def _name_similarity(a: str | None, b: str | None) -> float:
    ta = set(_normalize_name_tokens(a))
    tb = set(_normalize_name_tokens(b))
    if not ta or not tb:
        return 0.0
    inter = len(ta.intersection(tb))
    union = len(ta.union(tb))
    if union == 0:
        return 0.0
    return inter / union


def _find_client_by_phone(db: Session, sender_phone: str | None) -> Client | None:
    if not sender_phone:
        return None
    clients = db.query(Client).all()
    for client in clients:
        if _phones_match(sender_phone, client.phone):
            return client
    return None


def _find_client_by_name(db: Session, sender_name: str | None) -> Client | None:
    if not sender_name:
        return None
    clients = db.query(Client).all()
    best_client = None
    best_score = 0.0
    for client in clients:
        score = _name_similarity(sender_name, client.full_name)
        if score > best_score:
            best_score = score
            best_client = client

    # Umbral conservador: al menos 2/3 de tokens en común.
    return best_client if best_score >= 0.66 else None


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
    current_user: User | None,
    *,
    file,
    source_channel: VoucherSourceChannel = VoucherSourceChannel.manual,
    external_chat_id: str | None = None,
    external_message_id: str | None = None,
    sender_phone: str | None = None,
):
    _validate_mime_type(file.content_type)
    ext = _validate_extension(file.filename)
    content = _read_upload_bytes(file)
    _validate_file_size(content)
    file_sha256 = _compute_sha256(content)
    file_size_bytes = len(content)

    if external_chat_id and external_message_id:
        existing_by_external = voucher_intake_repository.get_by_external_message(
            db,
            source_channel=source_channel,
            external_chat_id=external_chat_id,
            external_message_id=external_message_id,
        )
        if existing_by_external:
            return existing_by_external

    dedup_since = datetime.now(timezone.utc) - timedelta(hours=settings.INTAKE_HASH_DEDUP_WINDOW_HOURS)
    existing_by_hash = voucher_intake_repository.get_recent_by_hash(db, file_sha256=file_sha256, since=dedup_since)
    if existing_by_hash:
        return existing_by_hash

    filename = f"intake_{source_channel.value}_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        buffer.write(content)

    payload = {
        "source_channel": source_channel,
        "external_chat_id": external_chat_id,
        "external_message_id": external_message_id,
        "sender_phone": sender_phone,
        "file_path": filename,
        "mime_type": file.content_type,
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
    intake = voucher_intake_repository.create_intake(db, payload)
    if settings.INTAKE_ASYNC_ENABLED:
        enqueue_intake_processing(intake.id)
        return intake

    from app.services.intake_processing_service import process_intake_job

    process_intake_job(intake.id)
    refreshed = voucher_intake_repository.get_by_id(db, intake.id)
    return refreshed or intake


def list_intakes(db: Session, status: VoucherMatchStatus | None = None, skip: int = 0, limit: int = 100):
    return voucher_intake_repository.list_intakes(db, status=status, skip=skip, limit=limit)


def get_intake(db: Session, intake_id: int):
    return voucher_intake_repository.get_by_id(db, intake_id)


def reprocess_intake(db: Session, intake_id: int):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

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
    intake = voucher_intake_repository.save(db, intake)

    if settings.INTAKE_ASYNC_ENABLED:
        enqueue_intake_processing(intake.id)
        return intake

    from app.services.intake_processing_service import process_intake_job

    process_intake_job(intake.id)
    refreshed = voucher_intake_repository.get_by_id(db, intake.id)
    return refreshed or intake


def attempt_match_intake(db: Session, intake_id: int):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

    matched_client = _find_client_by_phone(db, intake.sender_phone)
    if not matched_client:
        matched_client = _find_client_by_name(db, intake.extracted_sender_name)
    intake.matched_client_id = matched_client.id if matched_client else None

    if matched_client:
        matched_order = _find_best_order_match(db, matched_client.id, intake.extracted_amount)
        if matched_order:
            intake.matched_order_id = matched_order.id
            intake.created_order_id = None
            intake.match_status = VoucherMatchStatus.suggested
        else:
            # No crear pedidos automáticamente: esperar decisión del vendedor.
            intake.created_order_id = None
            intake.matched_order_id = None
            intake.match_status = VoucherMatchStatus.pending
    else:
        # Sin cliente identificado: no crear cliente/pedido/pago en automático.
        intake.matched_client_id = None
        intake.created_order_id = None
        intake.matched_order_id = None
        intake.match_status = VoucherMatchStatus.pending

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
    update_payment_status(db, payment.id, PaymentStatus.confirmed, notes="Confirmado desde intake automático")

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
    update_payment_status(db, payment.id, PaymentStatus.confirmed, notes="Confirmado desde reasignación de intake")

    intake.match_status = VoucherMatchStatus.confirmed
    intake.reviewed_by_user_id = current_user.id
    intake.reviewed_at = datetime.now(timezone.utc)
    return voucher_intake_repository.save(db, intake)
