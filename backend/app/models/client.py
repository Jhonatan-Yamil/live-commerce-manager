from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.models.base import Base


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    delivery_city = Column(String, nullable=True)
    delivery_department = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    orders = relationship("Order", back_populates="client")