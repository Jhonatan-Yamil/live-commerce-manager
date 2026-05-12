#!/bin/bash
set -e

echo "🔄 Running database migrations..."
alembic upgrade head
echo "✅ Migrations completed"

echo "🚀 Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips="127.0.0.1"