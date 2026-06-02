import enum
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Date, Text, String, JSON, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class DeliveryScheduleStatus(str, enum.Enum):
    scheduled = "scheduled"  # Programado para entregar
    delivered = "delivered"  # Se entregó exitosamente
    not_delivered = "not_delivered"  # No se logró entregar
    rescheduled = "rescheduled"  # Se reprogramó a otra fecha


class DeliverySchedule(Base):
    __tablename__ = "delivery_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    scheduled_date = Column(Date, nullable=False)  # Fecha programada para entregar
    delivery_location = Column(Text, nullable=True)  # Ciudad, almacén, dirección específica (legacy)
    location = Column(Text, nullable=True)  # Ubicación para entregas en la misma ciudad
    destination_city = Column(Text, nullable=True)  # Ciudad destino para entregas en otra ciudad
    delivery_mode = Column(String, nullable=True)  # same_city | other_city
    transport_companies = Column(JSON, nullable=True)  # Empresas de transporte para otras ciudades
    status = Column(SAEnum(DeliveryScheduleStatus), default=DeliveryScheduleStatus.scheduled, nullable=False)
    rescheduled_date = Column(Date, nullable=True)  # Fecha a la que se reprograma (si aplica)
    notes = Column(Text, nullable=True)  # Cambios de último momento, razones de no entrega, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    order = relationship("Order", back_populates="delivery_schedules")
    user = relationship("User", foreign_keys=[user_id])
