#!/bin/bash
# Stop the script if any command fails
set -e

echo "Starting BIS Recommendation Engine Backend..."

# Optional: You can uncomment these lines if you want Render to automatically run 
# database seeding upon every restart. Generally, running migrations is safer.
# alembic upgrade head
# python seed_data.py

# 1. Run the scraper daemon silently in the background
echo "Launching weekly web scraper daemon in background..."
python scraper.py &

# 2. Start the production FastAPI web server in the foreground
echo "Launching FastAPI server via Gunicorn..."
gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT
