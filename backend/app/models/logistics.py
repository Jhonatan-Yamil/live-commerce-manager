import enum
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class DeliveryType(str, enum.Enum):
    pickup = "pickup"
    delivery = "delivery"


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    dispatched = "dispatched"
    delivered = "delivered"
    failed = "failed"


class Logistics(Base):
    __tablename__ = "logistics"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    delivery_type = Column(SAEnum(DeliveryType), default=DeliveryType.delivery)
    delivery_status = Column(SAEnum(DeliveryStatus), default=DeliveryStatus.pending)
    address = Column(Text, nullable=True)
    tracking_notes = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="logistics")