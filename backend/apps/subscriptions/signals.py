"""
Signal handlers for subscription events.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Subscription, DiscountRule, DiscountApplication


@receiver(post_save, sender=Subscription)
def subscription_post_save(sender, instance, created, **kwargs):
    """
    Handle subscription creation/update events.
    """
    if created:
        # Log subscription creation
        pass
    
    # Update monthly value if needed
    if not instance.monthly_value or instance.monthly_value == 0:
        instance.monthly_value = instance.calculate_monthly_value()
        instance.save(update_fields=['monthly_value'])


@receiver(post_save, sender=DiscountApplication)
def discount_application_post_save(sender, instance, created, **kwargs):
    """
    Update discount rule usage count when discount is applied.
    """
    if created:
        discount_rule = instance.discount_rule
        discount_rule.usage_count += 1
        discount_rule.save(update_fields=['usage_count'])
