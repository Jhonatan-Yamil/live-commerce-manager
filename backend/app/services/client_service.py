from sqlalchemy.orm import Session

from app.repositories import client_repository


def normalize_client_name(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = " ".join(value.strip().split())
    if not cleaned:
        return cleaned

    letters_only = "".join(ch for ch in cleaned if ch.isalpha())
    if letters_only and (letters_only.islower() or letters_only.isupper()):
        return " ".join(word[:1].upper() + word[1:].lower() if word else word for word in cleaned.split(" "))

    return cleaned


def create_client(db: Session, payload: dict):
    if "full_name" in payload:
        payload = {**payload, "full_name": normalize_client_name(payload.get("full_name"))}
    return client_repository.create_client(db, payload)


def list_clients(db: Session):
    return client_repository.list_clients(db)


def get_client(db: Session, client_id: int):
    return client_repository.get_client_by_id(db, client_id)


def update_client(db: Session, client_id: int, payload: dict):
    if "full_name" in payload:
        payload = {**payload, "full_name": normalize_client_name(payload.get("full_name"))}
    return client_repository.update_client(db, client_id, payload)
