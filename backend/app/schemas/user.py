from datetime import datetime

from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.seller


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    logo_path: str | None = None
    whatsapp_instance_name: str | None = None
    whatsapp_instance_status: str | None = None
    whatsapp_connected_at: datetime | None = None
    whatsapp_intake_enabled: bool = True
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    logo_path: str | None = None
    whatsapp_instance_name: str | None = None
    whatsapp_instance_status: str | None = None
    whatsapp_connected_at: datetime | None = None
    whatsapp_intake_enabled: bool | None = None


class UserProfileUpdateIn(BaseModel):
    full_name: str


class UserPasswordUpdateIn(BaseModel):
    current_password: str
    new_password: str