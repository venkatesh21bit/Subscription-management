#!/bin/bash
# Build script for Railway deployment

set -e  # Exit on error

echo "======================="
echo "Running Build Script"
echo "======================="

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "======================="
echo "Build completed successfully!"
echo "======================="
