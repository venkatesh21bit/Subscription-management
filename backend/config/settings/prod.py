"""
Production settings for Vendor ERP Backend.
"""
import dj_database_url
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = [
    'backend-production-8d38.up.railway.app',
    'vendor-backend-production-2053.up.railway.app',
    # Add your production domains here
]

# Database - Override with DATABASE_URL from environment
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# SSL is handled by Railway automatically, don't force SSL requirement
# If using external database, uncomment and set ssl_require=True

# CORS Configuration for production
CORS_ALLOWED_ORIGINS = [
    "https://frontend-production-fbef1.up.railway.app",
    "https://vendor-frontend-production-be99.up.railway.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add your production frontend URLs here
]

# Using JWT Bearer tokens, not cookies, so credentials not needed
CORS_ALLOW_CREDENTIALS = False

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-company-id',
]

CORS_EXPOSE_HEADERS = [
    'content-type',
    'x-csrftoken',
]

CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

CSRF_TRUSTED_ORIGINS = [
    "https://frontend-production-fbef1.up.railway.app",
    "https://backend-production-8d38.up.railway.app",
    "https://vendor-backend-production-2053.up.railway.app",
    "https://vendor-frontend-production-be99.up.railway.app",
]

# Security Settings
# Railway handles SSL/HTTPS at the proxy level
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'django.log',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'app': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
