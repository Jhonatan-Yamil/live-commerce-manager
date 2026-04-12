from pydantic import BaseModel, field_validator


class ClientCreate(BaseModel):
    full_name: str
    phone: str
    address: str | None = None
    notes: str | None = None

    @field_validator("full_name", "phone")
    @classmethod
    def not_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Campo obligatorio")
        return value


class ClientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None

    @field_validator("full_name", "phone", mode="before")
    @classmethod
    def strip_optional(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


class ClientOut(BaseModel):
    id: int
    full_name: str
    phone: str | None
    address: str | None
    notes: str | None
    model_config = {"from_attributes": True}