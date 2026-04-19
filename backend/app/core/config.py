from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/livesale"
    SECRET_KEY: str = "changeme-super-secret-key-livesale-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_WEBHOOK_SECRET: str = "change-this-telegram-secret"
    TELEGRAM_WEBHOOK_AUTO_SETUP: bool = False
    TELEGRAM_PUBLIC_BASE_URL: str | None = None
    TELEGRAM_WEBHOOK_DROP_PENDING_UPDATES: bool = False
    NGROK_API_URL: str = "http://127.0.0.1:4040"
    TELEGRAM_WEBHOOK_SETUP_MAX_ATTEMPTS: int = 20
    TELEGRAM_WEBHOOK_SETUP_RETRY_SECONDS: int = 5
    INTAKE_ASYNC_ENABLED: bool = True
    INTAKE_QUEUE_BACKEND: str = "memory"
    INTAKE_QUEUE_KEY: str = "live-sale:intake-queue"
    REDIS_URL: str = "redis://localhost:6379/0"
    INTAKE_WORKER_EMBEDDED: bool = True
    INTAKE_MAX_FILE_SIZE_MB: int = 10
    INTAKE_HASH_DEDUP_WINDOW_HOURS: int = 24
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"


settings = Settings()