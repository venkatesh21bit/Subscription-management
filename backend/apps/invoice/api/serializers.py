"""
Invoice API serializers.
Handles invoice input/output marshaling for REST APIs.
"""
from rest_framework import serializers
from apps.invoice.models import Invoice, InvoiceLine, InvoicePayment


class InvoiceLineSerializer(serializers.ModelSerializer):
    """Serializer for invoice line items."""
    
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    uom_name = serializers.CharField(source='uom.name', read_only=True)
    
    class Meta:
        model = InvoiceLine
        fields = [
            'id', 'line_no', 'item', 'item_name', 'item_sku',
            'description', 'quantity', 'unit_rate', 'uom', 'uom_name',
            'discount_pct', 'line_total', 'tax_amount'
        ]
        read_only_fields = ['id', 'line_total', 'tax_amount']


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer for invoice payment records."""
    
    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'amount', 'payment_method', 'payment_date',
            'reference_number', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice with nested lines."""
    
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    party_email = serializers.SerializerMethodField()
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    currency_symbol = serializers.SerializerMethodField()
    sales_order_number = serializers.CharField(source='sales_order.order_number', read_only=True, allow_null=True)
    purchase_order_number = serializers.CharField(source='purchase_order.order_number', read_only=True, allow_null=True)
    voucher_number = serializers.CharField(source='voucher.voucher_number', read_only=True, allow_null=True)
    outstanding_amount = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date',
            'party', 'party_name', 'party_email', 'invoice_type', 'status',
            'currency', 'currency_code', 'currency_symbol',
            'sales_order', 'sales_order_number',
            'purchase_order', 'purchase_order_number',
            'voucher', 'voucher_number',
            'subtotal', 'tax_amount', 'discount_amount', 'grand_total',
            'total_amount', 'amount_received', 'paid_amount', 'outstanding_amount',
            'billing_period_start', 'billing_period_end', 'is_auto_generated',
            'terms_and_conditions', 'notes', 'lines', 'payments',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'company', 'voucher',
            'amount_received', 'created_at', 'updated_at'
        ]
    
    def get_outstanding_amount(self, obj):
        return float(obj.grand_total - obj.amount_received)
    
    def get_total_amount(self, obj):
        return float(obj.grand_total)
    
    def get_paid_amount(self, obj):
        return float(obj.amount_received)
    
    def get_party_email(self, obj):
        return getattr(obj.party, 'email', '') or ''
    
    def get_currency_symbol(self, obj):
        return getattr(obj.currency, 'symbol', '$') if obj.currency else '$'


class InvoiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing invoices."""
    
    party_name = serializers.CharField(source='party.name', read_only=True)
    party_email = serializers.SerializerMethodField()
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    currency_symbol = serializers.SerializerMethodField()
    outstanding_amount = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date',
            'party', 'party_name', 'party_email', 'invoice_type', 'status',
            'currency_code', 'currency_symbol',
            'subtotal', 'tax_amount', 'discount_amount', 'grand_total',
            'total_amount', 'amount_received', 'paid_amount', 'outstanding_amount',
            'billing_period_start', 'billing_period_end',
            'created_at'
        ]
    
    def get_outstanding_amount(self, obj):
        return float(obj.grand_total - obj.amount_received)
    
    def get_total_amount(self, obj):
        return float(obj.grand_total)
    
    def get_paid_amount(self, obj):
        return float(obj.amount_received)
    
    def get_party_email(self, obj):
        return getattr(obj.party, 'email', '') or ''
    
    def get_currency_symbol(self, obj):
        return getattr(obj.currency, 'symbol', '$') if obj.currency else '$'


class CreateInvoiceFromOrderSerializer(serializers.Serializer):
    """Serializer for creating invoice from sales order."""
    
    partial_allowed = serializers.BooleanField(default=False, required=False)
    apply_gst = serializers.BooleanField(default=True, required=False)
    company_state_code = serializers.CharField(max_length=5, required=False, allow_blank=True)
