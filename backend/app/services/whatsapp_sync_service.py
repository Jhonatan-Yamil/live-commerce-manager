from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.user import User
from app.services.whatsapp.evolution_client import EvolutionApiError, EvolutionWhatsAppClient
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> EvolutionWhatsAppClient | None:
    if not settings.WHATSAPP_EVOLUTION_BASE_URL or not settings.WHATSAPP_EVOLUTION_API_KEY:
        return None
    return EvolutionWhatsAppClient(settings.WHATSAPP_EVOLUTION_BASE_URL, settings.WHATSAPP_EVOLUTION_API_KEY)


def sync_all_whatsapp_users() -> None:
    """
    Consulta Evolution por cada usuario con instancia registrada
    y sincroniza su estado en la BD. Se llama periódicamente.
    """
    client = _get_client()
    if not client:
        return

    db: Session = SessionLocal()
    try:
        users = (
            db.query(User)
            .filter(
                User.whatsapp_instance_name.isnot(None),
                User.whatsapp_instance_name != "",
            )
            .all()
        )

        for user in users:
            try:
                response = client.connection_state(user.whatsapp_instance_name)
                state = (
                    response.get("instance", {}).get("state")
                    or response.get("instance", {}).get("status")
                    or response.get("status")
                    or response.get("connectionStatus")
                    or "close"
                )
                state = str(state)

                # Solo actualizar si cambió para no generar writes innecesarios
                if user.whatsapp_instance_status != state:
                    logger.info(
                        "Sync WhatsApp user=%s instancia=%s: %s → %s",
                        user.id,
                        user.whatsapp_instance_name,
                        user.whatsapp_instance_status,
                        state,
                    )
                    user.whatsapp_instance_status = state
                    if state in {"close", "closed", "disconnected"}:
                        user.whatsapp_connected_at = None
                    db.add(user)

            except EvolutionApiError as exc:
                if exc.status_code in {400, 404}:
                    # Instancia no existe en Evolution → marcar como desconectado
                    if user.whatsapp_instance_status != "close":
                        user.whatsapp_instance_status = "close"
                        user.whatsapp_connected_at = None
                        db.add(user)
                else:
                    logger.warning(
                        "Error sync WhatsApp user=%s: %s", user.id, exc
                    )
            except Exception as exc:
                logger.warning(
                    "Error inesperado sync WhatsApp user=%s: %s", user.id, exc
                )

        db.commit()

    except Exception as exc:
        logger.exception("Error en sync_all_whatsapp_users: %s", exc)
        db.rollback()
    finally:
        db.close()