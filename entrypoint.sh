#!/bin/sh
set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting app..."
exec fastapi run --host 0.0.0.0 --port "$PORT" --proxy-headers --forwarded-allow-ips '*'