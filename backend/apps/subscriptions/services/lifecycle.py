"""
Subscription lifecycle management service.

Handles state transitions: DRAFT → QUOTATION → CONFIRMED → ACTIVE → PAUSED/CLOSED
"""
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError


class SubscriptionLifecycleService:
    """
    Service for managing subscription lifecycle transitions.
    
    This is a placeholder - full implementation will come in next phase.
    """
    
    @staticmethod
    @transaction.atomic
    def transition_to_quotation(subscription):
        """
        Transition subscription from DRAFT to QUOTATION.
        """
        from apps.subscriptions.models import SubscriptionStatus
        
        if subscription.status != SubscriptionStatus.DRAFT:
            raise ValidationError(f"Can only transition to QUOTATION from DRAFT state")
        
        subscription.status = SubscriptionStatus.QUOTATION
        subscription.save(update_fields=['status'])
        
        return subscription
    
    @staticmethod
    @transaction.atomic
    def confirm_subscription(subscription):
        """
        Transition subscription from QUOTATION to CONFIRMED.
        """
        from apps.subscriptions.models import SubscriptionStatus
        
        if subscription.status != SubscriptionStatus.QUOTATION:
            raise ValidationError(f"Can only confirm from QUOTATION state")
        
        subscription.status = SubscriptionStatus.CONFIRMED
        subscription.confirmed_at = timezone.now()
        subscription.save(update_fields=['status', 'confirmed_at'])
        
        return subscription
    
    @staticmethod
    @transaction.atomic
    def activate_subscription(subscription):
        """
        Transition subscription to ACTIVE state and set up billing schedule.
        """
        from apps.subscriptions.models import SubscriptionStatus
        
        if subscription.status not in [SubscriptionStatus.CONFIRMED, SubscriptionStatus.PAUSED]:
            raise ValidationError(f"Can only activate from CONFIRMED or PAUSED state")
        
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.activated_at = timezone.now()
        
        # Set next billing date if not already set
        if not subscription.next_billing_date:
            subscription.next_billing_date = subscription.calculate_next_billing_date()
        
        subscription.save(update_fields=['status', 'activated_at', 'next_billing_date'])
        
        return subscription
    
    @staticmethod
    @transaction.atomic
    def pause_subscription(subscription):
        """
        Pause an active subscription.
        """
        from apps.subscriptions.models import SubscriptionStatus
        
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise ValidationError(f"Can only pause ACTIVE subscriptions")
        
        if not subscription.plan.is_pausable:
            raise ValidationError(f"This subscription plan does not allow pausing")
        
        subscription.status = SubscriptionStatus.PAUSED
        subscription.save(update_fields=['status'])
        
        return subscription
    
    @staticmethod
    @transaction.atomic
    def close_subscription(subscription, reason=""):
        """
        Close a subscription.
        """
        from apps.subscriptions.models import SubscriptionStatus
        
        if subscription.status == SubscriptionStatus.CLOSED:
            raise ValidationError(f"Subscription is already closed")
        
        subscription.status = SubscriptionStatus.CLOSED
        subscription.closed_at = timezone.now()
        subscription.cancellation_reason = reason
        subscription.save(update_fields=['status', 'closed_at', 'cancellation_reason'])
        
        return subscription
