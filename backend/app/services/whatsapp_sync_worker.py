from __future__ import annotations

import asyncio
import logging
from app.services.whatsapp_sync_service import sync_all_whatsapp_users

logger = logging.getLogger(__name__)

SYNC_INTERVAL_SECONDS = 60  


async def whatsapp_sync_loop() -> None:
    logger.info("WhatsApp sync worker iniciado (intervalo=%ds)", SYNC_INTERVAL_SECONDS)
    try:
        await asyncio.get_event_loop().run_in_executor(None, sync_all_whatsapp_users)
        logger.info("Sync inicial de WhatsApp completado")
    except Exception as exc:
        logger.exception("Error en sync inicial: %s", exc)

    while True:
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)
        try:
            await asyncio.get_event_loop().run_in_executor(None, sync_all_whatsapp_users)
        except Exception as exc:
            logger.exception("Error en whatsapp_sync_loop: %s", exc)
        
