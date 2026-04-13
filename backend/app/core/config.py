from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/livesale"
    SECRET_KEY: str = "changeme-super-secret-key-livesale-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_WEBHOOK_SECRET: str = "change-this-telegram-secret"
    INTAKE_ASYNC_ENABLED: bool = True
    INTAKE_QUEUE_BACKEND: str = "memory"
    INTAKE_QUEUE_KEY: str = "live-sale:intake-queue"
    REDIS_URL: str = "redis://localhost:6379/0"
    INTAKE_WORKER_EMBEDDED: bool = True

    class Config:
        env_file = ".env"


settings = Settings()