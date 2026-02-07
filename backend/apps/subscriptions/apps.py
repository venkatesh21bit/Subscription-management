"""
Subscriptions app configuration.
"""
from django.apps import AppConfig


class SubscriptionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.subscriptions'
    verbose_name = 'Subscription Management'
    
    def ready(self):
        """
        Import signals and register any startup code.
        """
        # Import signals when app is ready
        try:
            import apps.subscriptions.signals  # noqa
        except ImportError:
            pass
