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

# Start Gunicorn server
echo "Starting Gunicorn server on port ${PORT:-8080}..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8080} \
    --workers 4 \
    --timeout 120 \
    --worker-class sync \
    --access-logfile - \
    --error-logfile - \
    --log-level info
