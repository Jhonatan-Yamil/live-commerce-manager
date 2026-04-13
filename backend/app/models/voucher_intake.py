import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Numeric,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class VoucherSourceChannel(str, enum.Enum):
    manual = "manual"
    telegram = "telegram"
    whatsapp = "whatsapp"


class VoucherMatchStatus(str, enum.Enum):
    pending = "pending"
    suggested = "suggested"
    confirmed = "confirmed"
    rejected = "rejected"


class VoucherProcessingStatus(str, enum.Enum):
    queued = "queued"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class VoucherIntake(Base):
    __tablename__ = "voucher_intakes"

    id = Column(Integer, primary_key=True, index=True)
    source_channel = Column(SAEnum(VoucherSourceChannel), default=VoucherSourceChannel.manual, nullable=False)

    external_chat_id = Column(String, nullable=True)
    external_message_id = Column(String, nullable=True)
    sender_phone = Column(String, nullable=True)

    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)

    extracted_amount = Column(Numeric(10, 2), nullable=True)
    extracted_date = Column(DateTime(timezone=True), nullable=True)
    extracted_reference = Column(String, nullable=True)
    extracted_sender_name = Column(String, nullable=True)
    ocr_raw_text = Column(Text, nullable=True)
    ocr_confidence = Column(Numeric(5, 2), nullable=True)

    processing_status = Column(String, nullable=False, default=VoucherProcessingStatus.queued.value)
    processing_error = Column(Text, nullable=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_finished_at = Column(DateTime(timezone=True), nullable=True)
    processing_attempts = Column(Integer, nullable=False, default=0)

    match_status = Column(SAEnum(VoucherMatchStatus), default=VoucherMatchStatus.pending, nullable=False)

    matched_client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    matched_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    created_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)

    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    matched_client = relationship("Client", foreign_keys=[matched_client_id])
    matched_order = relationship("Order", foreign_keys=[matched_order_id])
    created_order = relationship("Order", foreign_keys=[created_order_id])
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by_user_id])
