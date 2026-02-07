"""
Serializers for Subscriptions app.
Handles subscription management, quotations, and recurring billing.
"""
from rest_framework import serializers
from apps.subscriptions.models import (
    Subscription,
    SubscriptionItem,
    SubscriptionPlan,
    QuotationTemplate,
    Quotation,
    QuotationItem,
    DiscountRule,
    ProductAttribute
)
from apps.company.models import Currency
from decimal import Decimal


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Serializer for Subscription Plan (for nested display).
    """
    id = serializers.UUIDField(read_only=True)
    billing_interval_display = serializers.CharField(source='get_billing_interval_display', read_only=True)
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id',
            'name',
            'billing_interval',
            'billing_interval_display',
            'billing_interval_count',
            'base_price',
            'is_active'
        ]
        read_only_fields = ['id']


class QuotationTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for Quotation Template (for nested display).
    """
    id = serializers.UUIDField(read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = QuotationTemplate
        fields = [
            'id',
            'name',
            'description',
            'plan',
            'plan_name',
            'validity_days',
            'is_active'
        ]
        read_only_fields = ['id']


class SubscriptionItemSerializer(serializers.ModelSerializer):
    """
    Serializer for Subscription Items (Order Lines).
    """
    id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_variant_id = serializers.UUIDField(source='product_variant.id', read_only=True, allow_null=True)
    product_variant_sku = serializers.CharField(source='product_variant.sku', read_only=True, allow_null=True)
    line_total = serializers.SerializerMethodField()
    tax_amount = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    
    class Meta:
        model = SubscriptionItem
        fields = [
            'id',
            'product_id',
            'product_name',
            'product_variant_id',
            'product_variant_sku',
            'quantity',
            'unit_price',
            'discount_pct',
            'tax_rate',
            'description',
            'line_total',
            'tax_amount',
            'total'
        ]
        read_only_fields = ['id', 'product_id', 'product_name', 'product_variant_id', 'product_variant_sku']
    
    def get_line_total(self, obj):
        """Calculate line total before tax"""
        return float(obj.calculate_line_total())
    
    def get_tax_amount(self, obj):
        """Calculate tax amount"""
        return float(obj.calculate_tax_amount())
    
    def get_total(self, obj):
        """Calculate total including tax"""
        return float(obj.calculate_total())


class SubscriptionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for subscription listing.
    Matches the first page UI showing list of subscriptions.
    
    Fields displayed:
    - Subscription number
    - Customer (Party)
    - Full Name
    - Expiration (end_date)
    - Monthly (monthly_value)
    - Plan
    - Status
    """
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    
    # Customer/Party information
    customer = serializers.CharField(source='party.name', read_only=True)
    customer_id = serializers.UUIDField(source='party.id', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    # Plan information
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    recurring_plan = serializers.CharField(source='plan.name', read_only=True)
    
    # Display fields
    expiration = serializers.DateField(source='end_date', read_only=True)
    monthly = serializers.DecimalField(source='monthly_value', max_digits=14, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id',
            'company_id',
            'subscription_number',
            'customer',
            'customer_id',
            'full_name',
            'expiration',
            'monthly',
            'plan_name',
            'recurring_plan',
            'status',
            'status_display',
            'start_date',
            'created_at'
        ]
        read_only_fields = ['id', 'company_id', 'subscription_number', 'created_at']
    
    def get_full_name(self, obj):
        """
        Get full name from party contact or party name.
        Depending on your Party model structure, adjust this.
        """
        # If Party has a contact_person field
        if hasattr(obj.party, 'contact_person') and obj.party.contact_person:
            return obj.party.contact_person
        return obj.party.name


class SubscriptionDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for subscription detail view.
    Matches the second page UI showing subscription details with order lines.
    
    Fields displayed:
    - Subscription number
    - Customer
    - Expiration
    - Quotation template
    - Recurring Plan
    - Payment Term
    - Order Lines
    - Start Date
    - Payment Method
    - Payment done
    """
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    
    # Customer/Party information
    customer = serializers.CharField(source='party.name', read_only=True)
    customer_id = serializers.UUIDField(source='party.id', read_only=True)
    party_details = serializers.SerializerMethodField()
    
    # Plan information
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    recurring_plan = serializers.CharField(source='plan.name', read_only=True)
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    
    # Quotation template
    quotation_template_name = serializers.CharField(source='quotation_template.name', read_only=True, allow_null=True)
    quotation_template_details = QuotationTemplateSerializer(source='quotation_template', read_only=True, allow_null=True)
    
    # Payment information
    payment_term = serializers.CharField(source='payment_terms', allow_blank=True)
    
    # Order lines (Subscription Items)
    order_lines = SubscriptionItemSerializer(source='items', many=True, read_only=True)
    
    # Display fields
    expiration = serializers.DateField(source='end_date', allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Calculated totals
    subtotal = serializers.SerializerMethodField()
    tax_total = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id',
            'company_id',
            'subscription_number',
            'customer',
            'customer_id',
            'party_details',
            'expiration',
            'start_date',
            'next_billing_date',
            'last_billing_date',
            'billing_cycle_count',
            'quotation_template',
            'quotation_template_name',
            'quotation_template_details',
            'recurring_plan',
            'plan_name',
            'plan',
            'plan_details',
            'payment_term',
            'payment_terms',
            'payment_method',
            'payment_done',
            'monthly_value',
            'currency',
            'status',
            'status_display',
            'order_lines',
            'subtotal',
            'tax_total',
            'grand_total',
            'discount_type',
            'discount_value',
            'discount_start',
            'discount_end',
            'terms_and_conditions',
            'notes',
            'confirmed_at',
            'activated_at',
            'cancelled_at',
            'cancellation_reason',
            'closed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'company_id',
            'subscription_number',
            'customer',
            'customer_id',
            'party_details',
            'quotation_template_name',
            'quotation_template_details',
            'recurring_plan',
            'plan_name',
            'plan_details',
            'order_lines',
            'subtotal',
            'tax_total',
            'grand_total',
            'status_display',
            'created_at',
            'updated_at'
        ]
    
    def get_party_details(self, obj):
        """Get party/customer details"""
        return {
            'id': str(obj.party.id),
            'name': obj.party.name,
            'email': getattr(obj.party, 'email', ''),
            'phone': getattr(obj.party, 'phone', ''),
        }
    
    def get_subtotal(self, obj):
        """Calculate subtotal of all order lines"""
        return float(sum(item.calculate_line_total() for item in obj.items.all()))
    
    def get_tax_total(self, obj):
        """Calculate total tax amount"""
        return float(sum(item.calculate_tax_amount() for item in obj.items.all()))
    
    def get_grand_total(self, obj):
        """Calculate grand total including tax"""
        return float(sum(item.calculate_total() for item in obj.items.all()))


class SubscriptionCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating subscriptions.
    """
    id = serializers.UUIDField(read_only=True)
    currency = serializers.PrimaryKeyRelatedField(
        queryset=Currency.objects.all(),
        allow_null=True,
        required=False,
        help_text="Currency for the subscription. If not provided, company default will be used."
    )
    payment_method = serializers.CharField(
        max_length=100,
        allow_blank=True,
        allow_null=True,
        required=False,
        help_text="Payment method (e.g., 'Credit Card', 'Bank Transfer')"
    )
    
    class Meta:
        model = Subscription
        fields = [
            'id',
            'party',
            'plan',
            'quotation_template',
            'start_date',
            'end_date',
            'next_billing_date',
            'payment_terms',
            'payment_method',
            'payment_done',
            'currency',
            'discount_type',
            'discount_value',
            'discount_start',
            'discount_end',
            'terms_and_conditions',
            'notes',
            'status'
        ]
        read_only_fields = ['id']
    
    def validate(self, data):
        """Validate subscription data"""
        if 'end_date' in data and 'start_date' in data:
            if data['end_date'] and data['end_date'] <= data['start_date']:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date'
                })
        
        if 'discount_start' in data and 'discount_end' in data:
            if data['discount_start'] and data['discount_end'] and data['discount_end'] <= data['discount_start']:
                raise serializers.ValidationError({
                    'discount_end': 'Discount end date must be after start date'
                })
        
        return data
    
    def create(self, validated_data):
        """Create subscription with company default currency if not provided"""
        # Handle currency - use first available currency if not provided
        if 'currency' not in validated_data or validated_data.get('currency') is None:
            # Try to get any currency
            default_currency = Currency.objects.first()
            if default_currency:
                validated_data['currency'] = default_currency
            else:
                raise serializers.ValidationError({
                    'currency': 'No currency found. Please create a currency first.'
                })
        
        # Handle payment_method - set empty string if None (model doesn't allow null)
        if 'payment_method' not in validated_data or validated_data.get('payment_method') is None:
            validated_data['payment_method'] = ''
        
        return super().create(validated_data)


class QuotationItemSerializer(serializers.ModelSerializer):
    """
    Serializer for Quotation Items.
    """
    id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    total = serializers.SerializerMethodField()
    
    class Meta:
        model = QuotationItem
        fields = [
            'id',
            'product',
            'product_name',
            'product_variant',
            'quantity',
            'unit_price',
            'discount_pct',
            'tax_rate',
            'total'
        ]
        read_only_fields = ['id', 'product_name']
    
    def get_total(self, obj):
        """Calculate total including discount and tax"""
        return float(obj.calculate_total())


class QuotationListSerializer(serializers.ModelSerializer):
    """
    Serializer for Quotation listing.
    """
    id = serializers.UUIDField(read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Quotation
        fields = [
            'id',
            'quotation_number',
            'party',
            'party_name',
            'plan',
            'plan_name',
            'status',
            'status_display',
            'valid_until',
            'start_date',
            'total_amount',
            'currency',
            'created_at'
        ]
        read_only_fields = ['id', 'quotation_number', 'created_at']


class QuotationDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Quotation.
    """
    id = serializers.UUIDField(read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = QuotationItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quotation
        fields = [
            'id',
            'quotation_number',
            'party',
            'party_name',
            'plan',
            'plan_name',
            'template',
            'template_name',
            'status',
            'status_display',
            'valid_until',
            'start_date',
            'total_amount',
            'currency',
            'items',
            'sent_at',
            'accepted_at',
            'rejected_at',
            'rejection_reason',
            'subscription',
            'terms_and_conditions',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'quotation_number',
            'party_name',
            'plan_name',
            'template_name',
            'status_display',
            'items',
            'created_at',
            'updated_at'
        ]


# ============================================================================
# CONFIGURATION SERIALIZERS
# ============================================================================

class DiscountRuleSerializer(serializers.ModelSerializer):
    """Serializer for Discount Rules."""
    id = serializers.UUIDField(read_only=True)
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)
    
    class Meta:
        model = DiscountRule
        fields = [
            'id',
            'name',
            'code',
            'description',
            'discount_type',
            'discount_type_display',
            'discount_value',
            'min_purchase_amount',
            'min_quantity',
            'max_usage_per_customer',
            'max_total_usage',
            'usage_count',
            'start_date',
            'end_date',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'code', 'usage_count', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Add products list to representation."""
        data = super().to_representation(instance)
        data['products'] = [str(p.id) for p in instance.applicable_products.all()]
        return data
    
    def create(self, validated_data):
        """Create discount with company from request context."""
        products_ids = self.initial_data.get('products', [])
        validated_data['company'] = self.context['request'].company
        discount = DiscountRule.objects.create(**validated_data)
        if products_ids:
            from apps.products.models import Product
            products = Product.objects.filter(id__in=products_ids, company=self.context['request'].company)
            discount.applicable_products.set(products)
        return discount
    
    def update(self, instance, validated_data):
        """Update discount rule."""
        products_ids = self.initial_data.get('products', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if products_ids is not None:
            from apps.products.models import Product
            products = Product.objects.filter(id__in=products_ids, company=self.context['request'].company)
            instance.applicable_products.set(products)
        return instance


class AttributeValueSerializer(serializers.Serializer):
    """Serializer for attribute values with extra pricing."""
    value = serializers.CharField()
    extra_price = serializers.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))


class ProductAttributeSerializer(serializers.ModelSerializer):
    """Serializer for Product Attributes."""
    id = serializers.UUIDField(read_only=True)
    values = serializers.JSONField(required=False)
    
    class Meta:
        model = ProductAttribute
        fields = [
            'id',
            'name',
            'values',
            'display_order',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_values(self, value):
        """Validate that values is a list of dicts with value and extra_price."""
        if not value:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Values must be a list")
        
        normalized_values = []
        for item in value:
            if isinstance(item, str):
                # If it's a string, convert to dict format
                normalized_values.append({'value': item, 'extra_price': '0.00'})
            elif isinstance(item, dict):
                # If it's a dict, ensure it has required fields
                if 'value' not in item:
                    raise serializers.ValidationError("Each value must have a 'value' field")
                normalized_values.append({
                    'value': item['value'],
                    'extra_price': str(item.get('extra_price', '0.00'))
                })
            else:
                raise serializers.ValidationError("Each value must be a string or dict")
        
        return normalized_values
    
    def create(self, validated_data):
        """Create attribute with company from request context."""
        validated_data['company'] = self.context['request'].company
        validated_data['product'] = None  # Global attributes don't have a product
        attribute = ProductAttribute.objects.create(**validated_data)
        return attribute
    
    def update(self, instance, validated_data):
        """Update attribute."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class RecurringPlanSerializer(serializers.ModelSerializer):
    """Serializer for Recurring Plans (SubscriptionPlan)."""
    id = serializers.UUIDField(read_only=True)
    billing_period = serializers.CharField(source='billing_interval')
    billing_interval = serializers.IntegerField(source='billing_interval_count')
    reminder_days = serializers.IntegerField(source='trial_period_days', required=False, default=0)
    auto_charge = serializers.BooleanField(default=False, required=False, write_only=True)
    closable = serializers.BooleanField(source='is_closable')
    pausable = serializers.BooleanField(source='is_pausable')
    resumable = serializers.BooleanField(source='is_renewable')
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id',
            'name',
            'billing_period',
            'billing_interval',
            'reminder_days',
            'auto_charge',
            'closable',
            'pausable',
            'resumable',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create recurring plan with company from request context."""
        # Remove auto_charge as it's not a model field
        validated_data.pop('auto_charge', None)
        validated_data['company'] = self.context['request'].company
        validated_data.setdefault('base_price', Decimal('0.00'))
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update recurring plan."""
        # Remove auto_charge as it's not a model field
        validated_data.pop('auto_charge', None)
        return super().update(instance, validated_data)


class QuotationTemplateDetailSerializer(serializers.ModelSerializer):
    """Enhanced serializer for Quotation Templates with products."""
    id = serializers.UUIDField(read_only=True)
    plan = serializers.UUIDField(required=False, allow_null=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    last_forever = serializers.SerializerMethodField()
    end_after_value = serializers.SerializerMethodField()
    end_after_period = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()
    
    class Meta:
        model = QuotationTemplate
        fields = [
            'id',
            'name',
            'validity_days',
            'plan',
            'plan_name',
            'last_forever',
            'end_after_value',
            'end_after_period',
            'products',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'plan_name', 'created_at', 'updated_at']
    
    def get_last_forever(self, obj):
        """Get last_forever from template_content."""
        return obj.template_content.get('last_forever', False)
    
    def get_end_after_value(self, obj):
        """Get end_after_value from template_content."""
        return obj.template_content.get('end_after_value')
    
    def get_end_after_period(self, obj):
        """Get end_after_period from template_content."""
        return obj.template_content.get('end_after_period')
    
    def get_products(self, obj):
        """Get products from template_content."""
        return obj.template_content.get('products', [])
    
    def create(self, validated_data):
        """Create template with company from request context."""
        plan_id = self.initial_data.get('plan') or self.initial_data.get('recurring_plan')  # Support both
        last_forever = self.initial_data.get('last_forever', False)
        end_after_value = self.initial_data.get('end_after_value')
        end_after_period = self.initial_data.get('end_after_period')
        products_data = self.initial_data.get('products', [])
        
        # Remove plan from validated_data if present
        validated_data.pop('plan', None)
        validated_data['company'] = self.context['request'].company
        
        # Get plan instance if provided
        if plan_id:
            plan = SubscriptionPlan.objects.get(id=plan_id, company=self.context['request'].company)
            validated_data['plan'] = plan
        
        validated_data['template_content'] = {
            'last_forever': last_forever,
            'end_after_value': end_after_value,
            'end_after_period': end_after_period,
            'products': products_data
        }
        return QuotationTemplate.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        """Update template."""
        plan_id = self.initial_data.get('plan') or self.initial_data.get('recurring_plan')  # Support both
        last_forever = self.initial_data.get('last_forever', False)
        end_after_value = self.initial_data.get('end_after_value')
        end_after_period = self.initial_data.get('end_after_period')
        products_data = self.initial_data.get('products', [])
        
        # Remove plan from validated_data
        validated_data.pop('plan', None)
        
        # Update plan if provided
        if plan_id:
            plan = SubscriptionPlan.objects.get(id=plan_id, company=self.context['request'].company)
            instance.plan = plan
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.template_content = {
            'last_forever': last_forever,
            'end_after_value': end_after_value,
            'end_after_period': end_after_period,
            'products': products_data
        }
        instance.save()
        return instance
