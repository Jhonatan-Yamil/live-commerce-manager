from __future__ import annotations

import logging
from queue import Empty, Queue
from typing import Protocol

from app.core.config import settings

try:
    import redis as redis_client
except Exception:
    redis_client = None


logger = logging.getLogger(__name__)


class IntakeQueueBackend(Protocol):
    name: str

    def put(self, intake_id: int) -> None:
        ...

    def get(self, timeout: float) -> int | None:
        ...

    def close(self) -> None:
        ...


class MemoryIntakeQueueBackend:
    name = "memory"

    def __init__(self) -> None:
        self._queue: Queue[int] = Queue()

    def put(self, intake_id: int) -> None:
        self._queue.put(intake_id)

    def get(self, timeout: float) -> int | None:
        try:
            return self._queue.get(timeout=timeout)
        except Empty:
            return None

    def close(self) -> None:
        return None


class RedisIntakeQueueBackend:
    name = "redis"

    def __init__(self, redis_url: str, queue_key: str) -> None:
        if redis_client is None:
            raise RuntimeError("La librería redis no está instalada")
        self._client = redis_client.Redis.from_url(redis_url, decode_responses=True)
        self._queue_key = queue_key
        self._client.ping()

    def put(self, intake_id: int) -> None:
        self._client.rpush(self._queue_key, str(intake_id))

    def get(self, timeout: float) -> int | None:
        result = self._client.blpop(self._queue_key, timeout=max(1, int(timeout)))
        if not result:
            return None
        _, value = result
        try:
            return int(value)
        except (TypeError, ValueError):
            logger.warning("Se ignoró un valor inválido en la cola Redis: %s", value)
            return None

    def close(self) -> None:
        self._client.close()


_backend: IntakeQueueBackend | None = None


def get_intake_queue_backend() -> IntakeQueueBackend:
    global _backend
    if _backend is not None:
        return _backend

    backend_name = (settings.INTAKE_QUEUE_BACKEND or "memory").strip().lower()
    if backend_name == "redis":
        try:
            _backend = RedisIntakeQueueBackend(settings.REDIS_URL, settings.INTAKE_QUEUE_KEY)
            logger.info("Intake queue backend inicializado en Redis")
            return _backend
        except Exception as exc:
            logger.warning("No se pudo inicializar Redis para la cola intake, se usa memoria: %s", exc)

    _backend = MemoryIntakeQueueBackend()
    logger.info("Intake queue backend inicializado en memoria")
    return _backend


def reset_intake_queue_backend() -> None:
    global _backend
    if _backend is not None:
        try:
            _backend.close()
        finally:
            _backend = None
