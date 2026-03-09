from pydantic import BaseModel


class ClientCreate(BaseModel):
    full_name: str
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class ClientUpdate(ClientCreate):
    pass


class ClientOut(BaseModel):
    id: int
    full_name: str
    phone: str | None
    address: str | None
    notes: str | None
    model_config = {"from_attributes": True}