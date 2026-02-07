import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

import django
django.setup()

from django.conf import settings
from django.apps import apps

print("Settings INSTALLED_APPS:")
for app in settings.INSTALLED_APPS:
    print(f"  - {app}")

print("\nActually loaded apps:")
for app in apps.get_app_configs():
    print(f"  - {app.name}")
