import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum as SAEnum, DateTime
from app.models.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    seller = "seller"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.seller, nullable=False)
    is_active = Column(Boolean, default=True)
    logo_path = Column(String, nullable=True)
    whatsapp_instance_name = Column(String, unique=True, index=True, nullable=True)
    whatsapp_instance_status = Column(String, nullable=True)
    whatsapp_connected_at = Column(DateTime(timezone=True), nullable=True)
    whatsapp_intake_enabled = Column(Boolean, default=True, nullable=False)