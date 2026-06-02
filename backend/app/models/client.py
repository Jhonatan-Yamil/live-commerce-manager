from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    delivery_city = Column(String, nullable=True)
    delivery_department = Column(String, nullable=True)
    delivery_mode = Column(String, nullable=True)
    delivery_transport_companies = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    orders = relationship("Order", back_populates="client")
    user = relationship("User", foreign_keys=[user_id])