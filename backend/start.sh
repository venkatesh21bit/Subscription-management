#!/bin/bash
# Start script for Railway Django deployment

set -e

echo "Starting Django application..."

# Ensure staticfiles directory exists
mkdir -p /app/staticfiles

# Run collectstatic if not already done
if [ ! "$(ls -A /app/staticfiles)" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput --clear
fi

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput || true

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
