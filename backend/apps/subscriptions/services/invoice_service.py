"""
Service to generate invoices from subscriptions.
Handles subscription billing and invoice creation for retailers.
"""
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import uuid

from apps.subscriptions.models import Subscription, SubscriptionItem
from apps.invoice.models import Invoice, InvoiceLine, InvoiceStatus
from apps.party.models import Party
from apps.accounting.models import AccountGroup, Ledger


class SubscriptionInvoiceService:
    """
    Service to generate invoices from active subscriptions.
    """
    
    @staticmethod
    @transaction.atomic
    def generate_invoice_from_subscription(subscription: Subscription, billing_period_start=None, billing_period_end=None):
        """
        Generate invoice from subscription.
        
        Args:
            subscription: Subscription instance
            billing_period_start: Start date for billing period
            billing_period_end: End date for billing period
            
        Returns:
            Invoice instance or None if failed
        """
        try:
            # Validate subscription
            if subscription.status not in ['ACTIVE', 'CONFIRMED']:
                raise ValueError(f"Cannot invoice subscription with status: {subscription.status}")
            
            # Calculate billing period if not provided
            if not billing_period_start:
                billing_period_start = subscription.start_date
            
            if not billing_period_end:
                if subscription.plan.billing_interval == 'MONTHLY':
                    billing_period_end = billing_period_start + timedelta(days=30)
                elif subscription.plan.billing_interval == 'YEARLY':
                    billing_period_end = billing_period_start + timedelta(days=365)
                elif subscription.plan.billing_interval == 'QUARTERLY':
                    billing_period_end = billing_period_start + timedelta(days=90)
                elif subscription.plan.billing_interval == 'WEEKLY':
                    billing_period_end = billing_period_start + timedelta(days=7)
                else:  # DAILY
                    billing_period_end = billing_period_start + timedelta(days=1)
            
            # Generate invoice number
            invoice_number = f"INV-{subscription.company.code}-{uuid.uuid4().hex[:8].upper()}"
            
            # Create invoice
            invoice = Invoice.objects.create(
                company=subscription.company,
                invoice_number=invoice_number,
                invoice_date=timezone.now().date(),
                party=subscription.party,
                invoice_type='SALES',
                status=InvoiceStatus.DRAFT,
                due_date=timezone.now().date() + timedelta(days=30),  # 30 days payment terms
                currency=subscription.currency,
                financial_year=subscription.company.financialyear_set.filter(is_current=True).first(),
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                notes=f"Invoice for subscription {subscription.plan.name}",
                terms_and_conditions=subscription.payment_terms or "Payment due within 30 days",
                total_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                discount_amount=Decimal('0.00')
            )
            
            # Add subscription items as invoice lines
            total_amount = Decimal('0.00')
            tax_amount = Decimal('0.00')
            subscription_items = SubscriptionItem.objects.filter(subscription=subscription)
            
            line_no = 1
            for item in subscription_items:
                # Get or create stock item from product
                from apps.inventory.models import StockItem
                stock_item = StockItem.objects.filter(
                    company=subscription.company,
                    product=item.product
                ).first()
                
                if not stock_item:
                    # Skip if no stock item exists for this product
                    continue
                
                # Calculate line amounts
                line_subtotal = item.unit_price * item.quantity
                discount_amount = line_subtotal * (item.discount_pct / Decimal('100'))
                line_total_after_discount = line_subtotal - discount_amount
                line_tax = line_total_after_discount * (item.tax_rate / Decimal('100'))
                
                total_amount += line_total_after_discount
                tax_amount += line_tax
                
                InvoiceLine.objects.create(
                    invoice=invoice,
                    line_no=line_no,
                    item=stock_item,
                    description=item.description or f"{item.product.name} - {subscription.plan.name}",
                    quantity=item.quantity,
                    uom=stock_item.uom,
                    unit_rate=item.unit_price,
                    discount_pct=item.discount_pct,
                    line_total=line_total_after_discount,
                    tax_amount=line_tax
                )
                line_no += 1
            
            # If no subscription items with stock items, use plan base price
            if line_no == 1:  # No lines were added
                # Get or create a generic subscription service item
                from apps.inventory.models import StockItem, UnitOfMeasure
                
                # Get a default UOM (e.g., "Service" or "Each")
                default_uom, _ = UnitOfMeasure.objects.get_or_create(
                    company=subscription.company,
                    code='SVC',
                    defaults={'name': 'Service', 'is_active': True}
                )
                
                # Get or create generic subscription stock item
                subscription_item, _ = StockItem.objects.get_or_create(
                    company=subscription.company,
                    sku='SUBSCRIPTION',
                    defaults={
                        'name': 'Subscription Service',
                        'uom': default_uom,
                        'is_stock_item': False,
                        'is_active': True
                    }
                )
                
                line_total = subscription.calculate_monthly_value()
                total_amount = line_total
                
                InvoiceLine.objects.create(
                    invoice=invoice,
                    line_no=1,
                    item=subscription_item,
                    description=f"Subscription: {subscription.plan.name}",
                    quantity=Decimal('1.00'),
                    uom=default_uom,
                    unit_rate=line_total,
                    discount_pct=Decimal('0.00'),
                    line_total=line_total,
                    tax_amount=Decimal('0.00')
                )
            
            # Apply discount if any (at subscription level)
            discount_amount = Decimal('0.00')
            if hasattr(subscription, 'discount_value') and subscription.discount_value and subscription.discount_value > 0:
                if subscription.discount_type == 'PERCENTAGE':
                    discount_amount = total_amount * (subscription.discount_value / 100)
                else:  # FIXED
                    discount_amount = min(subscription.discount_value, total_amount)
                
                total_amount -= discount_amount
            
            # Calculate final total (subtotal - discount + tax)
            final_total = total_amount + tax_amount
            
            # Update invoice totals
            invoice.discount_amount = discount_amount
            invoice.subtotal = total_amount
            invoice.tax_amount = tax_amount
            invoice.total_amount = final_total
            invoice.outstanding_amount = final_total
            invoice.save()
            
            # Update subscription next billing date
            subscription.next_billing_date = billing_period_end
            subscription.save()
            
            return invoice
            
        except Exception as e:
            print(f"Error generating invoice from subscription {subscription.id}: {str(e)}")
            return None
    
    @staticmethod
    @transaction.atomic
    def send_invoice_to_retailer(subscription: Subscription, auto_post=False):
        """
        Generate and send invoice to retailer.
        
        Args:
            subscription: Subscription instance
            auto_post: Whether to automatically post the invoice
            
        Returns:
            Dict with success status and invoice data
        """
        try:
            # Generate invoice
            invoice = SubscriptionInvoiceService.generate_invoice_from_subscription(subscription)
            
            if not invoice:
                return {
                    'success': False,
                    'message': 'Failed to generate invoice from subscription'
                }
            
            # Auto-post the invoice if requested
            if auto_post:
                invoice.status = InvoiceStatus.POSTED
                invoice.posted_at = timezone.now()
                invoice.save()
            
            return {
                'success': True,
                'message': 'Invoice generated and sent successfully',
                'invoice': {
                    'id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'total_amount': float(invoice.total_amount),
                    'currency': invoice.currency.code if invoice.currency else 'USD',
                    'status': invoice.status,
                    'due_date': invoice.due_date.isoformat(),
                    'customer_name': invoice.party.name,
                    'customer_email': invoice.party.email
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Error sending invoice to retailer: {str(e)}'
            }
    
    @staticmethod
    def process_billing_for_all_subscriptions(company=None):
        """
        Process billing for all active subscriptions due for billing.
        
        Args:
            company: Optional company to filter subscriptions
            
        Returns:
            Dict with processing results
        """
        try:
            today = timezone.now().date()
            
            # Filter subscriptions due for billing
            filters = {
                'status': 'ACTIVE',
                'next_billing_date__lte': today
            }
            
            if company:
                filters['company'] = company
            
            due_subscriptions = Subscription.objects.filter(**filters)
            
            results = {
                'total_processed': 0,
                'successful': 0,
                'failed': 0,
                'invoices_created': []
            }
            
            for subscription in due_subscriptions:
                results['total_processed'] += 1
                
                result = SubscriptionInvoiceService.send_invoice_to_retailer(
                    subscription, 
                    auto_post=True
                )
                
                if result['success']:
                    results['successful'] += 1
                    results['invoices_created'].append(result['invoice'])
                else:
                    results['failed'] += 1
                    print(f"Failed to bill subscription {subscription.id}: {result['message']}")
            
            return results
            
        except Exception as e:
            return {
                'total_processed': 0,
                'successful': 0,
                'failed': 0,
                'error': str(e)
            }