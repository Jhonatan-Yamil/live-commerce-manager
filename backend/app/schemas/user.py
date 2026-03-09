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
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None