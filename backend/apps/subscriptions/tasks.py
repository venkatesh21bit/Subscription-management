"""
Celery tasks for subscription management.

Background tasks for recurring billing, notifications, and cleanup.
"""
from celery import shared_task
from django.utils import timezone
from datetime import date


@shared_task(name='subscriptions.process_due_subscriptions')
def process_due_subscriptions():
    """
    Daily task to process subscriptions that are due for billing.
    
    Should be scheduled to run daily via celery beat.
    """
    from apps.subscriptions.services.billing import SubscriptionBillingService
    
    today = date.today()
    due_subscriptions = SubscriptionBillingService.get_due_subscriptions(as_of_date=today)
    
    success_count = 0
    error_count = 0
    
    for subscription in due_subscriptions:
        try:
            # Calculate billing period
            period_start = subscription.last_billing_date or subscription.start_date
            period_end = subscription.next_billing_date
            
            # Generate invoice
            invoice = SubscriptionBillingService.generate_invoice(
                subscription=subscription,
                period_start=period_start,
                period_end=period_end
            )
            
            success_count += 1
            
            # TODO: Send email notification
            # TODO: Post invoice to accounting if configured
            
        except Exception as e:
            error_count += 1
            # TODO: Log error and send alert
            print(f"Error processing subscription {subscription.subscription_number}: {str(e)}")
    
    return {
        'processed': success_count,
        'errors': error_count,
        'total': due_subscriptions.count()
    }


@shared_task(name='subscriptions.check_expired_quotations')
def check_expired_quotations():
    """
    Daily task to mark expired quotations.
    """
    from apps.subscriptions.models import Quotation, QuotationStatus
    
    today = date.today()
    
    expired = Quotation.objects.filter(
        status=QuotationStatus.SENT,
        valid_until__lt=today
    )
    
    count = expired.update(status=QuotationStatus.EXPIRED)
    
    return {'expired_count': count}


@shared_task(name='subscriptions.auto_close_subscriptions')
def auto_close_subscriptions():
    """
    Check for subscriptions that should be auto-closed.
    """
    from apps.subscriptions.models import Subscription, SubscriptionStatus
    from apps.subscriptions.services.lifecycle import SubscriptionLifecycleService
    
    today = date.today()
    
    # Find subscriptions with auto-close enabled that have reached end date
    to_close = Subscription.objects.filter(
        status=SubscriptionStatus.ACTIVE,
        plan__is_auto_closable=True,
        end_date__lte=today
    )
    
    closed_count = 0
    for subscription in to_close:
        try:
            SubscriptionLifecycleService.close_subscription(
                subscription,
                reason="Auto-closed: End date reached"
            )
            closed_count += 1
        except Exception as e:
            print(f"Error auto-closing subscription {subscription.subscription_number}: {str(e)}")
    
    return {'closed_count': closed_count}
