"""
Subscription billing service.

Handles automatic invoice generation from active subscriptions.
"""
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta


class SubscriptionBillingService:
    """
    Service for generating invoices from subscriptions.
    
    This is a placeholder - full implementation will come in next phase.
    """
    
    @staticmethod
    @transaction.atomic
    def generate_invoice(subscription, period_start, period_end):
        """
        Generate invoice from subscription for billing period.
        
        Args:
            subscription: Subscription instance
            period_start: Billing period start date
            period_end: Billing period end date
            
        Returns:
            Invoice instance
        """
        from apps.invoice.models import Invoice, InvoiceLine, InvoiceType, InvoiceStatus
        
        # Create invoice
        invoice = Invoice.objects.create(
            company=subscription.company,
            party=subscription.party,
            invoice_type=InvoiceType.SALES,
            invoice_date=period_end,
            due_date=period_end + timedelta(days=30),  # Default 30 days payment term
            currency=subscription.currency,
            
            # Subscription linkage
            subscription=subscription,
            billing_period_start=period_start,
            billing_period_end=period_end,
            is_auto_generated=True,
            
            status=InvoiceStatus.DRAFT,
        )
        
        # Create invoice lines from subscription items
        subtotal = Decimal('0.00')
        tax_total = Decimal('0.00')
        
        for sub_item in subscription.items.all():
            line_subtotal = sub_item.calculate_line_total()
            line_tax = sub_item.calculate_tax_amount()
            
            InvoiceLine.objects.create(
                invoice=invoice,
                item=sub_item.product_variant.stock_item if sub_item.product_variant and sub_item.product_variant.stock_item else None,
                description=sub_item.description or sub_item.product.name,
                quantity=sub_item.quantity,
                unit_rate=sub_item.unit_price,
                discount_pct=sub_item.discount_pct,
                # Tax fields would be populated here
            )
            
            subtotal += line_subtotal
            tax_total += line_tax
        
        # Update invoice totals
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_total
        invoice.grand_total = subtotal + tax_total
        invoice.save(update_fields=['subtotal', 'tax_amount', 'grand_total'])
        
        # Update subscription billing tracking
        subscription.last_billing_date = period_end
        subscription.next_billing_date = subscription.calculate_next_billing_date()
        subscription.billing_cycle_count += 1
        subscription.save(update_fields=['last_billing_date', 'next_billing_date', 'billing_cycle_count'])
        
        return invoice
    
    @staticmethod
    def get_due_subscriptions(as_of_date=None):
        """
        Get subscriptions that need billing as of a specific date.
        
        Args:
            as_of_date: Date to check (default: today)
            
        Returns:
            QuerySet of Subscription instances
        """
        from apps.subscriptions.models import Subscription, SubscriptionStatus
        
        if as_of_date is None:
            as_of_date = date.today()
        
        return Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            next_billing_date__lte=as_of_date
        )
