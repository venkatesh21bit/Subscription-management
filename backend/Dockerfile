# Use Python 3.11 slim image
FROM python:3.11.7-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project files
COPY . .

# Create staticfiles directory
RUN mkdir -p staticfiles

# Collect static files (use dummy DATABASE_URL for build step if not available)
RUN DATABASE_URL=sqlite:///tmp/db.sqlite3 python manage.py collectstatic --noinput --clear || echo "collectstatic warning - continuing build"

# Make entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose port - match Railway networking (Port 8000)
EXPOSE 8000

# Use entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]
