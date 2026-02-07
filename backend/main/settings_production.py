from .settings import *

DEBUG = False
ALLOWED_HOSTS = ['.railway.app']

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATIC_URL = '/static/'

# Database (Railway auto injects DATABASE_URL)
import dj_database_url
DATABASES['default'] = dj_database_url.config(conn_max_age=600, ssl_require=True)

# CORS
CORS_ALLOW_ALL_ORIGINS = True
