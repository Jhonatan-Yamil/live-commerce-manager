from __future__ import annotations

import logging
from threading import Event, Thread
from typing import Callable

from app.services.intake_queue_backend import get_intake_queue_backend, reset_intake_queue_backend


logger = logging.getLogger(__name__)

_stop_event = Event()
_worker_thread: Thread | None = None
_process_callback: Callable[[int], None] | None = None


def start_intake_worker(process_callback: Callable[[int], None]) -> None:
    global _worker_thread, _process_callback
    if _worker_thread and _worker_thread.is_alive():
        return

    _process_callback = process_callback
    _stop_event.clear()
    backend = get_intake_queue_backend()
    logger.info("Iniciando worker de intake con backend %s", backend.name)

    def _run() -> None:
        while not _stop_event.is_set():
            try:
                intake_id = backend.get(timeout=0.5)
            except Exception as exc:
                logger.exception("Error leyendo de la cola intake: %s", exc)
                continue

            if intake_id is None:
                continue

            try:
                if _process_callback:
                    _process_callback(intake_id)
            except Exception as exc:
                logger.exception("Error procesando intake %s: %s", intake_id, exc)

    _worker_thread = Thread(target=_run, name="intake-worker", daemon=True)
    _worker_thread.start()


def stop_intake_worker() -> None:
    global _worker_thread
    if not _worker_thread:
        return
    _stop_event.set()
    _worker_thread.join(timeout=2)
    _worker_thread = None
    reset_intake_queue_backend()


def enqueue_intake_processing(intake_id: int) -> None:
    get_intake_queue_backend().put(intake_id)
