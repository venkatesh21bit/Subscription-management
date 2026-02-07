"""
Test script to simulate recurring payment billing cycles.

Checks each ACTIVE subscription's billing interval (Daily/Weekly/Monthly/Quarterly/Yearly)
against its next_billing_date. If the billing date is due (today or past), it generates
an invoice and advances the billing cycle — exactly as a production cron job would.

Usage:
    python manage.py shell < scripts/test_recurring_payments.py
    
    OR inside Django shell:
        exec(open('scripts/test_recurring_payments.py').read())
"""
import os
import sys
import django

# Setup Django if running standalone
if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.base'
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    django.setup()

from datetime import timedelta
from django.utils import timezone
from apps.subscriptions.models import Subscription, BillingInterval


def check_recurring_due(subscription):
    """
    Check whether a subscription's recurring payment is due based on its
    billing interval and next_billing_date.
    
    Returns a dict with:
        - is_due: bool
        - billing_interval: str (e.g. 'MONTHLY')
        - next_billing_date: date
        - days_overdue: int (0 if not yet due, positive if overdue)
        - cycles_completed: int
    """
    today = timezone.now().date()
    next_date = subscription.next_billing_date
    interval = subscription.plan.billing_interval
    interval_display = subscription.plan.get_billing_interval_display()
    
    is_due = next_date <= today
    days_overdue = (today - next_date).days if is_due else 0
    
    return {
        'subscription_id': str(subscription.id),
        'subscription_number': subscription.subscription_number,
        'customer': subscription.party.name,
        'plan': subscription.plan.name,
        'billing_interval': interval,
        'billing_interval_display': interval_display,
        'next_billing_date': next_date.isoformat(),
        'last_billing_date': subscription.last_billing_date.isoformat() if subscription.last_billing_date else None,
        'is_due': is_due,
        'days_overdue': days_overdue,
        'cycles_completed': subscription.billing_cycle_count,
        'monthly_value': float(subscription.monthly_value),
        'status': subscription.status,
    }


def simulate_recurring_payment(subscription, force=False):
    """
    Simulate a recurring payment for a subscription.
    
    If force=True, fast-forwards next_billing_date to today so the invoice
    is generated immediately regardless of the actual schedule.
    
    Returns result dict with invoice info or error.
    """
    from apps.subscriptions.services.invoice_service import SubscriptionInvoiceService
    
    today = timezone.now().date()
    check = check_recurring_due(subscription)
    
    if not check['is_due'] and not force:
        return {
            'success': False,
            'message': f"Not yet due. Next billing: {check['next_billing_date']} "
                       f"({abs((subscription.next_billing_date - today).days)} days remaining)",
            'check': check,
        }
    
    if force and not check['is_due']:
        # Fast-forward: set next_billing_date to today so billing triggers
        print(f"  [SIMULATE] Fast-forwarding next_billing_date from "
              f"{subscription.next_billing_date} → {today}")
        subscription.next_billing_date = today
        subscription.save(update_fields=['next_billing_date'])
    
    # Generate invoice via the billing service
    result = SubscriptionInvoiceService.send_invoice_to_retailer(
        subscription, auto_post=True
    )
    
    return {
        'success': result['success'],
        'message': result['message'],
        'invoice': result.get('invoice'),
        'check': check,
        'new_next_billing_date': subscription.next_billing_date.isoformat(),
        'new_billing_cycle_count': subscription.billing_cycle_count,
    }


def run_simulation(company_id=None, force=False):
    """
    Run recurring payment simulation for all ACTIVE subscriptions.
    
    Args:
        company_id: UUID - filter by company (optional)
        force: bool - if True, force-bill even if not yet due
    """
    print("=" * 70)
    print("  RECURRING PAYMENT SIMULATION")
    print(f"  Date: {timezone.now().date()}")
    print(f"  Force mode: {'ON (will fast-forward billing dates)' if force else 'OFF (only bill if due)'}")
    print("=" * 70)
    
    filters = {'status': 'ACTIVE'}
    if company_id:
        filters['company_id'] = company_id
    
    subscriptions = Subscription.objects.filter(**filters).select_related('plan', 'party', 'currency')
    
    if not subscriptions.exists():
        print("\n  No active subscriptions found.")
        return
    
    print(f"\n  Found {subscriptions.count()} active subscription(s)\n")
    
    results = {'processed': 0, 'billed': 0, 'skipped': 0, 'failed': 0}
    
    for sub in subscriptions:
        results['processed'] += 1
        check = check_recurring_due(sub)
        
        print(f"  [{results['processed']}] {sub.subscription_number} | "
              f"{sub.party.name} | {sub.plan.name}")
        print(f"      Interval: {check['billing_interval_display']} | "
              f"Next billing: {check['next_billing_date']} | "
              f"Cycles: {check['cycles_completed']}")
        
        if check['is_due']:
            print(f"      ✓ PAYMENT DUE (overdue by {check['days_overdue']} day(s))")
        else:
            remaining = (sub.next_billing_date - timezone.now().date()).days
            print(f"      ○ Not yet due ({remaining} day(s) remaining)")
        
        result = simulate_recurring_payment(sub, force=force)
        
        if result['success']:
            results['billed'] += 1
            inv = result['invoice']
            print(f"      → Invoice {inv['invoice_number']} created | "
                  f"Amount: {inv['currency']} {inv['total_amount']}")
            print(f"      → Next billing date: {result['new_next_billing_date']} | "
                  f"Cycle #{result['new_billing_cycle_count']}")
        elif 'Not yet due' in result['message']:
            results['skipped'] += 1
            print(f"      → Skipped: {result['message']}")
        else:
            results['failed'] += 1
            print(f"      → FAILED: {result['message']}")
        
        print()
    
    print("-" * 70)
    print(f"  SUMMARY: {results['processed']} processed | "
          f"{results['billed']} billed | "
          f"{results['skipped']} skipped | "
          f"{results['failed']} failed")
    print("-" * 70)
    
    return results


if __name__ == '__main__' or '__file__' not in dir():
    # Run with force=False by default (only bill subscriptions that are actually due)
    # Change to force=True to simulate immediate billing for all active subscriptions
    run_simulation(force=False)
