#!/bin/bash
# Docker entrypoint script for Django on Railway

set -e

echo "======================================"
echo "Starting Django Application"
echo "======================================"

# Wait for database to be ready (optional, Railway handles this)
echo "Checking database connection..."

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

echo "Migrations completed successfully!"

# Create default superuser if none exists
echo "Checking for superuser..."
python manage.py create_default_superuser

echo "======================================"
# Start Gunicorn server
# Railway sets PORT env var - default to 8000 to match Railway networking config
echo "Starting Gunicorn server on port ${PORT:-8000}..."
echo "DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE}"
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 4 \
    --timeout 120 \
    --worker-class sync \
    --access-logfile - \
    --error-logfile - \
    --log-level info
