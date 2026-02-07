"""
Invoice API views.
RESTful endpoints for invoice management, generation, posting, and payment.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal
from datetime import date

from core.permissions.base import RolePermission
from apps.orders.models import SalesOrder
from apps.invoice.models import Invoice, InvoicePayment
from apps.invoice.api.serializers import (
    InvoiceSerializer, InvoiceListSerializer, CreateInvoiceFromOrderSerializer,
    InvoicePaymentSerializer
)
from apps.invoice.selectors import list_outstanding_invoices, get_invoice
from apps.invoice.services.invoice_generation_service import InvoiceGenerationService
from core.services.posting import PostingService


def _reduce_product_stock(invoice):
    """
    Reduce product available_quantity for each invoice line.
    Called when an invoice is confirmed/posted.
    """
    from apps.products.models import Product
    for line in invoice.lines.select_related('item__product').all():
        if line.item and line.item.product_id:
            try:
                product = Product.objects.get(id=line.item.product_id)
                qty_to_reduce = int(line.quantity)
                product.available_quantity = max(0, product.available_quantity - qty_to_reduce)
                if product.available_quantity == 0 and product.status != 'discontinued':
                    product.status = 'out_of_stock'
                product.save(update_fields=['available_quantity', 'status', 'updated_at'])
            except Product.DoesNotExist:
                pass


def _get_retailer_party_ids(user):
    """Get party IDs for a retailer user."""
    from apps.party.models import RetailerUser
    return list(
        RetailerUser.objects.filter(
            user=user, status='APPROVED', party__isnull=False
        ).values_list('party_id', flat=True)
    )


# ================================================================
# 1) Create invoice from sales order
# ================================================================
class InvoiceFromSalesOrderView(APIView):
    """Generate an invoice from a confirmed sales order."""
    permission_classes = [RolePermission.require(['ADMIN', 'ACCOUNTANT', 'SALES_MANAGER'])]

    def post(self, request, so_id):
        company = request.company
        serializer = CreateInvoiceFromOrderSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            sales_order = SalesOrder.objects.get(company=company, id=so_id)

            if sales_order.status not in ['CONFIRMED', 'IN_PROGRESS']:
                return Response(
                    {'error': f'Cannot create invoice from {sales_order.status} order'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            invoice = InvoiceGenerationService.generate_from_sales_order(
                sales_order=sales_order,
                created_by=request.user,
                partial_allowed=serializer.validated_data.get('partial_allowed', False),
                apply_gst=serializer.validated_data.get('apply_gst', True),
                company_state_code=serializer.validated_data.get('company_state_code') or getattr(company, 'state_code', '')
            )

            response_serializer = InvoiceSerializer(invoice)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except SalesOrder.DoesNotExist:
            return Response({'error': 'Sales order not found'}, status=status.HTTP_404_NOT_FOUND)
        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Failed to generate invoice: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ================================================================
# 2) Post invoice -> triggers stock posting + GL posting
# ================================================================
class InvoicePostingView(APIView):
    permission_classes = [RolePermission.require(['ADMIN', 'ACCOUNTANT'])]

    def post(self, request, invoice_id):
        company = request.company

        try:
            invoice = Invoice.objects.get(company=company, id=invoice_id)

            if invoice.status == 'POSTED':
                return Response(
                    {'error': 'Invoice already posted', 'voucher_id': str(invoice.voucher.id) if invoice.voucher else None},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if invoice.status == 'CANCELLED':
                return Response({'error': 'Cannot post cancelled invoice'}, status=status.HTTP_400_BAD_REQUEST)

            posting_service = PostingService()

            if not invoice.voucher:
                voucher = posting_service.create_voucher_from_invoice(invoice)
                invoice.voucher = voucher
                invoice.save(update_fields=['voucher'])

            posted_voucher = posting_service.post_voucher(voucher_id=invoice.voucher.id, posted_by=request.user)

            invoice.status = 'POSTED'
            invoice.save(update_fields=['status'])

            # Reduce product stock
            _reduce_product_stock(invoice)

            return Response({
                'voucher_id': str(posted_voucher.id),
                'voucher_number': posted_voucher.voucher_number,
                'status': 'POSTED',
                'message': 'Invoice posted successfully'
            })

        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'Failed to post invoice: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ================================================================
# 3) Outstanding invoices
# ================================================================
class InvoiceOutstandingView(APIView):
    def get(self, request):
        company = request.company
        qs = list_outstanding_invoices(company)

        invoice_type = request.query_params.get('invoice_type')
        if invoice_type:
            qs = qs.filter(invoice_type=invoice_type)

        party_id = request.query_params.get('party')
        if party_id:
            qs = qs.filter(party_id=party_id)

        serializer = InvoiceListSerializer(qs, many=True)
        return Response(serializer.data)


# ================================================================
# 4) List/Get invoice details - supports both manufacturer & retailer
# ================================================================
class InvoiceListView(APIView):
    """List invoices. Manufacturer sees company invoices, retailer sees own."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = request.company

        # Check if user is a retailer
        retailer_party_ids = _get_retailer_party_ids(request.user)

        if retailer_party_ids:
            # Retailer: show invoices where they are the party
            qs = Invoice.objects.filter(
                party_id__in=retailer_party_ids
            ).select_related(
                'party', 'currency', 'sales_order', 'purchase_order'
            ).order_by('-invoice_date', '-created_at')
        elif company:
            # Manufacturer: show all company invoices
            qs = Invoice.objects.filter(company=company).select_related(
                'party', 'currency', 'sales_order', 'purchase_order'
            ).order_by('-invoice_date', '-created_at')
        else:
            return Response([])

        # Filters
        invoice_status = request.query_params.get('status')
        if invoice_status:
            qs = qs.filter(status=invoice_status)

        invoice_type = request.query_params.get('invoice_type')
        if invoice_type:
            qs = qs.filter(invoice_type=invoice_type)

        party_id = request.query_params.get('party')
        if party_id:
            qs = qs.filter(party_id=party_id)

        start_date = request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(invoice_date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(invoice_date__lte=end_date)

        serializer = InvoiceListSerializer(qs, many=True)
        return Response(serializer.data)


class InvoiceDetailView(APIView):
    """Get invoice details with line items and payments."""
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        retailer_party_ids = _get_retailer_party_ids(request.user)

        try:
            if retailer_party_ids:
                invoice = Invoice.objects.select_related(
                    'party', 'currency', 'sales_order', 'purchase_order', 'voucher'
                ).prefetch_related('lines', 'payments').get(
                    id=invoice_id, party_id__in=retailer_party_ids
                )
            else:
                invoice = Invoice.objects.select_related(
                    'party', 'currency', 'sales_order', 'purchase_order', 'voucher'
                ).prefetch_related('lines', 'payments').get(
                    id=invoice_id, company=request.company
                )
            serializer = InvoiceSerializer(invoice)
            return Response(serializer.data)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)


# ================================================================
# 5) Confirm invoice (DRAFT -> POSTED)
# ================================================================
class InvoiceConfirmView(APIView):
    """Confirm a draft invoice. Changes status from DRAFT to POSTED."""
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id, company=request.company)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status != 'DRAFT':
            return Response(
                {'error': f'Can only confirm draft invoices. Current status: {invoice.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invoice.status = 'POSTED'
        invoice.save(update_fields=['status'])

        # Reduce product stock
        _reduce_product_stock(invoice)

        serializer = InvoiceSerializer(invoice)
        return Response({
            'message': 'Invoice confirmed successfully',
            'invoice': serializer.data
        })


# ================================================================
# 6) Record payment against invoice
# ================================================================
class InvoiceRecordPaymentView(APIView):
    """
    Record a payment against an invoice.

    POST /invoices/{id}/record-payment/
    Body: { amount, payment_method, payment_date, reference_number?, notes? }

    Updates invoice status automatically:
    - POSTED/PARTIALLY_PAID + partial payment -> PARTIALLY_PAID
    - POSTED/PARTIALLY_PAID + full payment -> PAID
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        # Allow both manufacturer and retailer access
        retailer_party_ids = _get_retailer_party_ids(request.user)

        try:
            if retailer_party_ids:
                invoice = Invoice.objects.get(id=invoice_id, party_id__in=retailer_party_ids)
            else:
                invoice = Invoice.objects.get(id=invoice_id, company=request.company)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status in ['CANCELLED', 'PAID']:
            return Response(
                {'error': f'Cannot record payment on {invoice.status} invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate input
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'CASH')
        payment_date_str = request.data.get('payment_date', str(date.today()))
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
        except Exception:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        outstanding = invoice.grand_total - invoice.amount_received
        if amount > outstanding:
            return Response(
                {'error': f'Amount {amount} exceeds outstanding balance {outstanding}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse date
        try:
            payment_date = date.fromisoformat(payment_date_str) if isinstance(payment_date_str, str) else payment_date_str
        except ValueError:
            payment_date = date.today()

        # Create payment record (save triggers invoice status update)
        payment = InvoicePayment.objects.create(
            invoice=invoice,
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date,
            reference_number=reference_number,
            notes=notes
        )

        # Refresh invoice from DB
        invoice.refresh_from_db()

        return Response({
            'message': 'Payment recorded successfully',
            'payment': InvoicePaymentSerializer(payment).data,
            'invoice': {
                'id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'status': invoice.status,
                'grand_total': float(invoice.grand_total),
                'amount_received': float(invoice.amount_received),
                'outstanding': float(invoice.grand_total - invoice.amount_received)
            }
        }, status=status.HTTP_201_CREATED)
