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
            
            # Resolve currency - use subscription's currency or company default
            currency = subscription.currency
            if not currency:
                from apps.company.models import Currency
                currency = Currency.objects.first()
                if not currency:
                    raise ValueError("No currency configured. Please create a currency first.")
            
            # Generate invoice number
            company_code = getattr(subscription.company, 'code', 'SUB')
            invoice_number = f"INV-{company_code}-{uuid.uuid4().hex[:8].upper()}"
            
            # Create invoice (use correct model field names: subtotal, grand_total)
            invoice = Invoice.objects.create(
                company=subscription.company,
                invoice_number=invoice_number,
                invoice_date=timezone.now().date(),
                party=subscription.party,
                invoice_type='SALES',
                status=InvoiceStatus.DRAFT,
                due_date=timezone.now().date() + timedelta(days=30),
                currency=currency,
                financial_year=subscription.company.company_financialyear_set.filter(is_current=True).first(),
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                is_auto_generated=True,
                notes=f"Invoice for subscription {subscription.plan.name} ({subscription.subscription_number})",
                terms_and_conditions=subscription.payment_terms or "Payment due within 30 days",
            )
            
            # Add subscription items as invoice lines
            subtotal = Decimal('0.00')
            tax_total = Decimal('0.00')
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
                    continue
                
                # Calculate line amounts
                line_subtotal = item.unit_price * item.quantity
                line_discount = line_subtotal * (item.discount_pct / Decimal('100'))
                line_total_after_discount = line_subtotal - line_discount

                # Determine effective tax rate: use subscription item's tax_rate
                # if set, otherwise auto-calculate from product GST rates
                effective_tax_rate = item.tax_rate
                if (not effective_tax_rate or effective_tax_rate == 0) and item.product:
                    product = item.product
                    gst_from_product = (
                        getattr(product, 'cgst_rate', 0) or Decimal('0')
                    ) + (
                        getattr(product, 'sgst_rate', 0) or Decimal('0')
                    )
                    igst_from_product = getattr(product, 'igst_rate', 0) or Decimal('0')
                    effective_tax_rate = max(gst_from_product, igst_from_product)
                line_tax = line_total_after_discount * (effective_tax_rate / Decimal('100'))
                
                subtotal += line_total_after_discount
                tax_total += line_tax
                
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
            if line_no == 1:
                from apps.inventory.models import StockItem, UnitOfMeasure
                
                default_uom, _ = UnitOfMeasure.objects.get_or_create(
                    symbol='SVC',
                    defaults={'name': 'Service', 'category': 'QUANTITY'}
                )
                
                subscription_stock_item, _ = StockItem.objects.get_or_create(
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
                subtotal = line_total
                
                InvoiceLine.objects.create(
                    invoice=invoice,
                    line_no=1,
                    item=subscription_stock_item,
                    description=f"Subscription: {subscription.plan.name}",
                    quantity=Decimal('1.00'),
                    uom=default_uom,
                    unit_rate=line_total,
                    discount_pct=Decimal('0.00'),
                    line_total=line_total,
                    tax_amount=Decimal('0.00')
                )
            
            # Apply subscription-level discount
            discount_amount = Decimal('0.00')
            if subscription.discount_value and subscription.discount_value > 0:
                if subscription.discount_type == 'PERCENTAGE':
                    discount_amount = subtotal * (subscription.discount_value / 100)
                else:
                    discount_amount = min(subscription.discount_value, subtotal)
                subtotal -= discount_amount
            
            # Calculate final total
            grand_total = subtotal + tax_total
            
            # Update invoice totals with correct field names
            invoice.discount_amount = discount_amount
            invoice.subtotal = subtotal
            invoice.tax_amount = tax_total
            invoice.grand_total = grand_total
            invoice.save()
            
            # Update subscription billing tracking
            # Use the current next_billing_date as the anchor so repeated
            # simulations advance the schedule correctly instead of always
            # computing from "today".
            current_next = subscription.next_billing_date
            subscription.last_billing_date = current_next or timezone.now().date()
            subscription.next_billing_date = subscription.calculate_next_billing_date()
            subscription.billing_cycle_count += 1
            subscription.save(update_fields=['last_billing_date', 'next_billing_date', 'billing_cycle_count'])

            # Reduce product available_quantity for each invoice line
            from apps.products.models import Product
            for inv_line in InvoiceLine.objects.filter(invoice=invoice).select_related('item__product'):
                if inv_line.item and inv_line.item.product_id:
                    try:
                        product = Product.objects.get(id=inv_line.item.product_id)
                        qty = int(inv_line.quantity)
                        product.available_quantity = max(0, product.available_quantity - qty)
                        if product.available_quantity == 0 and product.status != 'discontinued':
                            product.status = 'out_of_stock'
                        product.save(update_fields=['available_quantity', 'status', 'updated_at'])
                    except Product.DoesNotExist:
                        pass
            
            return invoice
            
        except Exception as e:
            import traceback
            print(f"Error generating invoice from subscription {subscription.id}: {str(e)}")
            traceback.print_exc()
            raise  # Re-raise so the caller gets the actual error
    
    @staticmethod
    @transaction.atomic
    def send_invoice_to_retailer(subscription: Subscription, auto_post=True):
        """
        Generate and send invoice to retailer.
        Default auto_post=True so invoices are POSTED (visible to retailer).
        """
        try:
            invoice = SubscriptionInvoiceService.generate_invoice_from_subscription(subscription)
            
            if not invoice:
                return {
                    'success': False,
                    'message': 'Failed to generate invoice from subscription'
                }
            
            # Auto-post: Draft → Posted (confirmed)
            if auto_post:
                invoice.status = InvoiceStatus.POSTED
                invoice.save(update_fields=['status'])
            
            return {
                'success': True,
                'message': 'Invoice generated and sent successfully',
                'invoice': {
                    'id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'total_amount': float(invoice.grand_total),
                    'currency': invoice.currency.code if invoice.currency else 'INR',
                    'status': invoice.status,
                    'due_date': invoice.due_date.isoformat(),
                    'customer_name': invoice.party.name,
                    'customer_email': invoice.party.email or ''
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }
    
    @staticmethod
    def process_billing_for_all_subscriptions(company=None):
        """
        Process billing for all active subscriptions due for billing.
        """
        try:
            today = timezone.now().date()
            
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