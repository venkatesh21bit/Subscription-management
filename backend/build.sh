#!/bin/bash
# Build script for Railway deployment

echo "======================="
echo "Running Build Script"
echo "======================="

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

echo "======================="
echo "Build completed successfully!"
echo "======================="
