#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql+psycopg://bis:bis@db:5432/bis_recommend"
fi

echo "Seeding catalogue (idempotent)…"
python seed_data.py

echo "Starting API…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
