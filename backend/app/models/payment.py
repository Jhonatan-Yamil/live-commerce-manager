import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    in_review = "in_review"
    confirmed = "confirmed"
    rejected = "rejected"

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.pending)
    voucher_path = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payment")