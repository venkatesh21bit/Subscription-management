"""
Subscription Management System Models

Models:
- SubscriptionPlan: Recurring billing plan templates
- PlanProduct: Products included in a plan
- Subscription: Active subscription instances
- SubscriptionItem: Line items per subscription
- ProductAttribute: Variant attributes definition
- ProductVariant: Attribute-based product variants
- Quotation: Pre-subscription proposals
- QuotationTemplate: Reusable quotation templates
- QuotationItem: Line items in quotation
- DiscountRule: Discount configuration
- DiscountApplication: Applied discount audit trail
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta
from core.models import CompanyScopedModel, BaseModel
import uuid


class BillingInterval(models.TextChoices):
    """Billing frequency options"""
    DAILY = 'DAILY', 'Daily'
    WEEKLY = 'WEEKLY', 'Weekly'
    MONTHLY = 'MONTHLY', 'Monthly'
    QUARTERLY = 'QUARTERLY', 'Quarterly'
    YEARLY = 'YEARLY', 'Yearly'


class SubscriptionStatus(models.TextChoices):
    """Subscription lifecycle states"""
    DRAFT = 'DRAFT', 'Draft'
    QUOTATION = 'QUOTATION', 'Quotation Sent'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    ACTIVE = 'ACTIVE', 'Active'
    PAUSED = 'PAUSED', 'Paused'
    CANCELLED = 'CANCELLED', 'Cancelled'
    CLOSED = 'CLOSED', 'Closed'


class QuotationStatus(models.TextChoices):
    """Quotation status"""
    DRAFT = 'DRAFT', 'Draft'
    SENT = 'SENT', 'Sent'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    REJECTED = 'REJECTED', 'Rejected'
    EXPIRED = 'EXPIRED', 'Expired'


class DiscountType(models.TextChoices):
    """Discount calculation type"""
    FIXED = 'FIXED', 'Fixed Amount'
    PERCENTAGE = 'PERCENTAGE', 'Percentage'


# ============================================================================
# SUBSCRIPTION PLAN MODELS
# ============================================================================

class SubscriptionPlan(CompanyScopedModel):
    """
    Recurring billing plan template.
    
    Defines the structure of a subscription offering including billing frequency,
    pricing, included products, and plan options.
    
    Examples:
    - "Premium Monthly" - $99/month with 5 products
    - "Enterprise Annual" - $999/year with unlimited products
    """
    name = models.CharField(
        max_length=200,
        db_index=True,
        help_text="Plan display name (e.g., 'Premium Monthly', 'Enterprise Annual')"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed plan description for customers"
    )
    
    # Billing configuration
    billing_interval = models.CharField(
        max_length=20,
        choices=BillingInterval.choices,
        default=BillingInterval.MONTHLY,
        help_text="How often to bill: Daily/Weekly/Monthly/Quarterly/Yearly"
    )
    billing_interval_count = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="Billing frequency multiplier (e.g., 2 = every 2 months)"
    )
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Base subscription price per billing cycle"
    )
    setup_fee = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="One-time setup fee charged on first billing"
    )
    trial_period_days = models.PositiveIntegerField(
        default=0,
        help_text="Number of days for free trial (0 = no trial)"
    )
    
    # Plan options (from PDF requirements)
    is_auto_closable = models.BooleanField(
        default=False,
        help_text="Automatically close after end_date"
    )
    is_closable = models.BooleanField(
        default=True,
        help_text="Can be manually closed by user"
    )
    is_pausable = models.BooleanField(
        default=True,
        help_text="Can be paused/suspended temporarily"
    )
    is_renewable = models.BooleanField(
        default=True,
        help_text="Can be renewed after expiration"
    )
    
    # Constraints
    min_quantity = models.PositiveIntegerField(
        default=1,
        help_text="Minimum quantity required per product"
    )
    
    # Validity
    start_date = models.DateField(
        null=True,
        blank=True,
        help_text="Plan becomes available from this date"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Plan no longer available after this date"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Is this plan currently available for new subscriptions?"
    )
    
    # Products linked via PlanProduct through model
    
    class Meta:
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"
        unique_together = [("company", "name")]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['company', 'billing_interval']),
            models.Index(fields=['company', 'start_date', 'end_date']),
        ]
    
    def __str__(self):
        interval_display = f"every {self.billing_interval_count} " if self.billing_interval_count > 1 else ""
        return f"{self.name} - ${self.base_price}/{interval_display}{self.get_billing_interval_display()}"
    
    def clean(self):
        """Validate plan configuration"""
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError("End date must be after start date")
        
        if self.base_price < 0:
            raise ValidationError("Base price cannot be negative")
    
    def is_available_on(self, date):
        """Check if plan is available on a specific date"""
        if not self.is_active:
            return False
        if self.start_date and date < self.start_date:
            return False
        if self.end_date and date > self.end_date:
            return False
        return True
    
    def calculate_monthly_value(self):
        """
        Convert any billing interval to monthly value for MRR calculation.
        """
        from datetime import timedelta
        
        if self.billing_interval == BillingInterval.DAILY:
            return self.base_price * Decimal('30') / self.billing_interval_count
        elif self.billing_interval == BillingInterval.WEEKLY:
            return self.base_price * Decimal('4.33') / self.billing_interval_count  # Average weeks per month
        elif self.billing_interval == BillingInterval.MONTHLY:
            return self.base_price / self.billing_interval_count
        elif self.billing_interval == BillingInterval.QUARTERLY:
            return self.base_price / (3 * self.billing_interval_count)
        elif self.billing_interval == BillingInterval.YEARLY:
            return self.base_price / (12 * self.billing_interval_count)
        return self.base_price


class PlanProduct(BaseModel):
    """
    Products included in a subscription plan with quantities and pricing.
    
    Links SubscriptionPlan → Product with specific quantity and unit price.
    """
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name='plan_products'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='plan_memberships'
    )
    product_variant = models.ForeignKey(
        'ProductVariant',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='plan_memberships',
        help_text="Specific variant if product has variants"
    )
    
    # Quantities and pricing
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal('1.0000'),
        validators=[MinValueValidator(Decimal('0.0001'))],
        help_text="Quantity included per billing cycle"
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Price per unit (overrides product default)"
    )
    
    class Meta:
        unique_together = [("plan", "product", "product_variant")]
        ordering = ['product__name']
    
    def __str__(self):
        variant_str = f" ({self.product_variant.sku})" if self.product_variant else ""
        return f"{self.plan.name} - {self.product.name}{variant_str} x {self.quantity}"


# ============================================================================
# PRODUCT VARIANT MODELS
# ============================================================================

class ProductAttribute(CompanyScopedModel):
    """
    Defines variant attributes for a product.
    Can be global (product=None) or product-specific.
    
    Examples:
    - Product: T-Shirt, Attribute: Size, Values: ["S", "M", "L", "XL"]
    - Product: Laptop, Attribute: RAM, Values: ["8GB", "16GB", "32GB"]
    - Global: Color, Values: ["Red", "Blue", "Green"] (product=None)
    """
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='attributes',
        null=True,
        blank=True,
        help_text="Product this attribute belongs to. Null for global attributes."
    )
    name = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Attribute name (e.g., 'Size', 'Color', 'Material')"
    )
    values = models.JSONField(
        default=list,
        help_text="List of possible values: ['S', 'M', 'L'] or ['Red', 'Blue']"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order on product page"
    )
    
    class Meta:
        verbose_name = "Product Attribute"
        verbose_name_plural = "Product Attributes"
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['company', 'product']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.name}"
    
    def clean(self):
        """Validate attribute values"""
        if not isinstance(self.values, list):
            raise ValidationError("Values must be a list")
        if len(self.values) == 0:
            raise ValidationError("At least one value is required")


class ProductVariant(CompanyScopedModel):
    """
    Specific product variant with attribute values and pricing.
    
    Examples:
    - Product: T-Shirt, Attributes: {Size: "M", Color: "Red"}, SKU: "TSHIRT-M-RED"
    - Product: Laptop, Attributes: {RAM: "16GB", Storage: "512GB"}, SKU: "LAP-16-512"
    """
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='variants'
    )
    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Stock Keeping Unit - unique identifier for this variant"
    )
    
    # Variant attributes
    attributes = models.JSONField(
        default=dict,
        help_text='Attribute values: {"Size": "M", "Color": "Red"}'
    )
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Base price for this variant"
    )
    price_adjustments = models.JSONField(
        default=dict,
        blank=True,
        help_text='Price adjustments per attribute: {"Size": 50, "Color": 100}'
    )
    
    # Inventory link (optional)
    stock_item = models.ForeignKey(
        'inventory.StockItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='product_variants',
        help_text="Link to inventory tracking (if physical product)"
    )
    
    # Display
    display_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Display name override (auto-generated if blank)"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Is this variant available for sale?"
    )
    
    class Meta:
        verbose_name = "Product Variant"
        verbose_name_plural = "Product Variants"
        unique_together = [("product", "attributes")]
        ordering = ['product__name', 'sku']
        indexes = [
            models.Index(fields=['company', 'product', 'is_active']),
            models.Index(fields=['sku']),
        ]
    
    def __str__(self):
        attr_str = ", ".join([f"{k}={v}" for k, v in self.attributes.items()])
        return f"{self.product.name} ({attr_str})"
    
    def save(self, *args, **kwargs):
        """Auto-generate display name if not provided"""
        if not self.display_name:
            attr_str = " - ".join([f"{v}" for v in self.attributes.values()])
            self.display_name = f"{self.product.name} ({attr_str})"
        super().save(*args, **kwargs)
    
    def calculate_final_price(self):
        """Calculate final price including all adjustments"""
        final_price = self.base_price
        for attr, adjustment in self.price_adjustments.items():
            final_price += Decimal(str(adjustment))
        return final_price
    
    def clean(self):
        """Validate variant attributes"""
        if not isinstance(self.attributes, dict):
            raise ValidationError("Attributes must be a dictionary")
        
        # Validate attributes match product's defined attributes
        product_attrs = set(self.product.attributes.values_list('name', flat=True))
        variant_attrs = set(self.attributes.keys())
        
        # Check if product has variants enabled
        if not self.product.has_variants:
            raise ValidationError(f"Product '{self.product.name}' does not support variants")


# ============================================================================
# SUBSCRIPTION MODELS
# ============================================================================

class Subscription(CompanyScopedModel):
    """
    Active subscription instance.
    
    Represents a customer's active subscription to a plan with lifecycle tracking,
    billing schedule, and payment information.
    
    Lifecycle: DRAFT → QUOTATION → CONFIRMED → ACTIVE → PAUSED/CANCELLED/CLOSED
    """
    subscription_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique subscription identifier (auto-generated)"
    )
    
    # Customer and plan
    party = models.ForeignKey(
        'party.Party',
        on_delete=models.PROTECT,
        related_name='subscriptions',
        help_text="Customer/subscriber"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        help_text="Subscription plan template"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.DRAFT,
        db_index=True,
        help_text="Current subscription state"
    )
    
    # Billing schedule
    start_date = models.DateField(
        db_index=True,
        help_text="Subscription start date"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Subscription end date (null = no end date)"
    )
    next_billing_date = models.DateField(
        db_index=True,
        help_text="Next scheduled billing date"
    )
    last_billing_date = models.DateField(
        null=True,
        blank=True,
        help_text="Last invoice generation date"
    )
    billing_cycle_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of billing cycles completed"
    )
    
    # Pricing
    monthly_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Normalized monthly recurring revenue (MRR)"
    )
    currency = models.ForeignKey(
        'company.Currency',
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )
    
    # Discount configuration
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        blank=True,
        help_text="Discount type: Fixed or Percentage"
    )
    discount_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Discount amount or percentage value"
    )
    discount_start = models.DateField(
        null=True,
        blank=True,
        help_text="Discount validity start date"
    )
    discount_end = models.DateField(
        null=True,
        blank=True,
        help_text="Discount validity end date"
    )
    
    # Payment terms
    payment_terms = models.TextField(
        null=True,
        blank=True,
        help_text="Payment terms and conditions"
    )
    payment_method = models.CharField(
        max_length=100,
        blank=True,
        help_text="Payment method used (e.g., 'Credit Card', 'Bank Transfer', 'Cash')"
    )
    payment_done = models.BooleanField(
        default=False,
        help_text="Whether payment has been completed"
    )
    
    # Template reference
    quotation_template = models.ForeignKey(
        'QuotationTemplate',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='subscriptions_using_template',
        help_text="Quotation template used for this subscription"
    )
    
    # Lifecycle tracking
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When subscription was confirmed"
    )
    activated_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When subscription became active"
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When subscription was cancelled"
    )
    cancellation_reason = models.TextField(
        blank=True,
        help_text="Reason for cancellation"
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When subscription was closed"
    )
    
    # Additional info
    terms_and_conditions = models.TextField(
        blank=True,
        help_text="Subscription terms and conditions"
    )
    notes = models.TextField(
        blank=True,
        help_text="Internal notes"
    )
    
    class Meta:
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        unique_together = [("company", "subscription_number")]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status', 'next_billing_date']),
            models.Index(fields=['company', 'party', 'status']),
            models.Index(fields=['company', 'start_date']),
            models.Index(fields=['next_billing_date', 'status']),  # For billing tasks
            models.Index(fields=['subscription_number']),
        ]
    
    def __str__(self):
        if hasattr(self, 'subscription_number') and self.subscription_number:
            return f"Subscription {self.subscription_number}"
        return f"Subscription {self.id}"
    
    def save(self, *args, **kwargs):
        """Auto-generate subscription number if not provided"""
        if not self.subscription_number:
            # Generate format: SUB-YYYYMMDD-XXXXXX
            from datetime import date
            today = date.today()
            prefix = f"SUB-{today.strftime('%Y%m%d')}"
            
            # Get last subscription for today
            last_sub = Subscription.objects.filter(
                subscription_number__startswith=prefix
            ).order_by('-subscription_number').first()
            
            if last_sub:
                last_num = int(last_sub.subscription_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.subscription_number = f"{prefix}-{new_num:06d}"
        
        # Set default monthly value for new instances only
        if not self.pk and not self.monthly_value and self.plan:
            self.monthly_value = self.plan.base_price or Decimal('0.00')
        
        super().save(*args, **kwargs)
    
    def calculate_monthly_value(self):
        """Calculate normalized monthly recurring revenue"""
        # Only calculate if subscription has been saved and has items
        if not self.pk:
            return self.plan.base_price or Decimal('0.00')
        
        # Get total from items
        items_total = sum(
            item.quantity * item.unit_price
            for item in self.items.all()
        )
        
        # Convert to monthly based on billing interval or use plan base price
        return self.plan.calculate_monthly_value() or items_total or self.plan.base_price or Decimal('0.00')
    
    def calculate_next_billing_date(self):
        """Calculate next billing date based on plan interval"""
        from dateutil.relativedelta import relativedelta
        
        current = self.last_billing_date or self.start_date
        
        if self.plan.billing_interval == BillingInterval.DAILY:
            return current + timedelta(days=self.plan.billing_interval_count)
        elif self.plan.billing_interval == BillingInterval.WEEKLY:
            return current + timedelta(weeks=self.plan.billing_interval_count)
        elif self.plan.billing_interval == BillingInterval.MONTHLY:
            return current + relativedelta(months=self.plan.billing_interval_count)
        elif self.plan.billing_interval == BillingInterval.QUARTERLY:
            return current + relativedelta(months=3 * self.plan.billing_interval_count)
        elif self.plan.billing_interval == BillingInterval.YEARLY:
            return current + relativedelta(years=self.plan.billing_interval_count)
        
        return current
    
    def clean(self):
        """Validate subscription configuration"""
        if self.end_date and self.end_date <= self.start_date:
            raise ValidationError("End date must be after start date")
        
        if self.discount_start and self.discount_end and self.discount_end <= self.discount_start:
            raise ValidationError("Discount end date must be after start date")


class SubscriptionItem(BaseModel):
    """
    Line items in a subscription.
    
    Links subscription to products with quantities, pricing, and taxes.
    Can override plan defaults.
    """
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='subscription_items'
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='subscription_items',
        help_text="Specific variant if product has variants"
    )
    
    # Quantities and pricing
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.0001'))],
        help_text="Quantity per billing cycle"
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Price per unit"
    )
    
    # Discount
    discount_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Line-level discount percentage"
    )
    
    # Tax information (copied from product at time of subscription creation)
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total tax rate percentage"
    )
    
    # Description override
    description = models.TextField(
        blank=True,
        help_text="Custom description (overrides product description)"
    )
    
    class Meta:
        ordering = ['product__name']
    
    def __str__(self):
        variant_str = f" ({self.product_variant.sku})" if self.product_variant else ""
        return f"{self.subscription.subscription_number} - {self.product.name}{variant_str}"
    
    def calculate_line_total(self):
        """Calculate line total before tax"""
        subtotal = self.quantity * self.unit_price
        discount_amount = subtotal * (self.discount_pct / Decimal('100'))
        return subtotal - discount_amount
    
    def calculate_tax_amount(self):
        """Calculate tax amount"""
        line_total = self.calculate_line_total()
        return line_total * (self.tax_rate / Decimal('100'))
    
    def calculate_total(self):
        """Calculate line total including tax"""
        return self.calculate_line_total() + self.calculate_tax_amount()


# ============================================================================
# QUOTATION MODELS
# ============================================================================

class Quotation(CompanyScopedModel):
    """
    Pre-subscription proposal sent to customers.
    
    Represents a quote/proposal that can be accepted to create a subscription.
    """
    quotation_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique quotation identifier (auto-generated)"
    )
    
    # Customer and plan
    party = models.ForeignKey(
        'party.Party',
        on_delete=models.PROTECT,
        related_name='quotations',
        help_text="Customer receiving the quotation"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='quotations',
        help_text="Proposed subscription plan"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=QuotationStatus.choices,
        default=QuotationStatus.DRAFT,
        db_index=True,
        help_text="Quotation status"
    )
    
    # Validity
    valid_until = models.DateField(
        db_index=True,
        help_text="Quotation expiry date"
    )
    start_date = models.DateField(
        help_text="Proposed subscription start date"
    )
    
    # Pricing
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total quoted amount"
    )
    currency = models.ForeignKey(
        'company.Currency',
        on_delete=models.PROTECT,
        related_name='quotations'
    )
    
    # Lifecycle tracking
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When quotation was sent to customer"
    )
    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When customer accepted quotation"
    )
    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When customer rejected quotation"
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection"
    )
    
    # Link to created subscription
    subscription = models.OneToOneField(
        Subscription,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='source_quotation',
        help_text="Subscription created from this quotation"
    )
    
    # Template used
    template = models.ForeignKey(
        'QuotationTemplate',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='quotations',
        help_text="Template used to create this quotation"
    )
    
    # Terms
    terms_and_conditions = models.TextField(
        blank=True,
        help_text="Quotation terms and conditions"
    )
    notes = models.TextField(
        blank=True,
        help_text="Internal notes"
    )
    
    class Meta:
        verbose_name = "Quotation"
        verbose_name_plural = "Quotations"
        unique_together = [("company", "quotation_number")]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status', 'valid_until']),
            models.Index(fields=['company', 'party', 'status']),
            models.Index(fields=['quotation_number']),
        ]
    
    def __str__(self):
        return f"{self.quotation_number} - {self.party.name}"
    
    def save(self, *args, **kwargs):
        """Auto-generate quotation number if not provided"""
        if not self.quotation_number:
            # Generate format: QUO-YYYYMMDD-XXXXXX
            from datetime import date
            today = date.today()
            prefix = f"QUO-{today.strftime('%Y%m%d')}"
            
            # Get last quotation for today
            last_quo = Quotation.objects.filter(
                quotation_number__startswith=prefix
            ).order_by('-quotation_number').first()
            
            if last_quo:
                last_num = int(last_quo.quotation_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.quotation_number = f"{prefix}-{new_num:06d}"
        
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if quotation has expired"""
        from datetime import date
        return self.valid_until < date.today()
    
    def clean(self):
        """Validate quotation"""
        if self.valid_until <= self.start_date:
            raise ValidationError("Valid until date must be after start date")


class QuotationItem(BaseModel):
    """
    Line items in a quotation.
    """
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='quotation_items'
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='quotation_items'
    )
    
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.0001'))]
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    discount_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    class Meta:
        ordering = ['product__name']
    
    def __str__(self):
        return f"{self.quotation.quotation_number} - {self.product.name}"
    
    def calculate_total(self):
        """Calculate line total including discount and tax"""
        subtotal = self.quantity * self.unit_price
        discount_amount = subtotal * (self.discount_pct / Decimal('100'))
        taxable = subtotal - discount_amount
        tax_amount = taxable * (self.tax_rate / Decimal('100'))
        return taxable + tax_amount


class QuotationTemplate(CompanyScopedModel):
    """
    Reusable quotation templates.
    
    Defines default structure for quotations to speed up creation.
    """
    name = models.CharField(
        max_length=200,
        db_index=True,
        help_text="Template name"
    )
    description = models.TextField(
        blank=True,
        help_text="Template description"
    )
    
    # Default plan
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name='templates',
        help_text="Default subscription plan for this template"
    )
    
    # Default validity
    validity_days = models.PositiveIntegerField(
        default=30,
        help_text="Number of days quotation is valid (from creation)"
    )
    
    # Default terms
    default_terms_and_conditions = models.TextField(
        blank=True,
        help_text="Default T&C to include in quotations"
    )
    
    # Template content (flexible JSON for custom fields)
    template_content = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional template configuration"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True
    )
    
    class Meta:
        verbose_name = "Quotation Template"
        verbose_name_plural = "Quotation Templates"
        unique_together = [("company", "name")]
        ordering = ['name']
        indexes = [
            models.Index(fields=['company', 'is_active']),
        ]
    
    def __str__(self):
        return self.name


# ============================================================================
# DISCOUNT MODELS
# ============================================================================

class DiscountRule(CompanyScopedModel):
    """
    Discount rule configuration.
    
    Defines discount parameters, constraints, and applicability.
    Can be applied to products, subscriptions, or both.
    """
    name = models.CharField(
        max_length=200,
        db_index=True,
        help_text="Discount name (e.g., 'Summer Sale 20%', 'New Customer $50 Off')"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique discount code (auto-generated if blank)"
    )
    description = models.TextField(
        blank=True,
        help_text="Discount description"
    )
    
    # Discount configuration
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        help_text="Fixed amount or percentage discount"
    )
    discount_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Discount value (amount or percentage)"
    )
    
    # Constraints
    min_purchase_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Minimum purchase amount required"
    )
    min_quantity = models.PositiveIntegerField(
        default=0,
        help_text="Minimum quantity required"
    )
    max_usage_per_customer = models.PositiveIntegerField(
        default=0,
        help_text="Max uses per customer (0 = unlimited)"
    )
    max_total_usage = models.PositiveIntegerField(
        default=0,
        help_text="Max total uses across all customers (0 = unlimited)"
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Current usage count"
    )
    
    # Validity
    start_date = models.DateField(
        db_index=True,
        help_text="Discount becomes valid from this date"
    )
    end_date = models.DateField(
        db_index=True,
        help_text="Discount expires after this date"
    )
    
    # Applicability
    applies_to_products = models.BooleanField(
        default=True,
        help_text="Can be applied to product purchases"
    )
    applies_to_subscriptions = models.BooleanField(
        default=True,
        help_text="Can be applied to subscriptions"
    )
    applicable_products = models.ManyToManyField(
        'products.Product',
        blank=True,
        related_name='discount_rules',
        help_text="Specific products this discount applies to (empty = all products)"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Is this discount currently active?"
    )
    
    class Meta:
        verbose_name = "Discount Rule"
        verbose_name_plural = "Discount Rules"
        unique_together = [("company", "name")]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'is_active', 'start_date', 'end_date']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        type_str = f"{self.discount_value}%" if self.discount_type == DiscountType.PERCENTAGE else f"${self.discount_value}"
        return f"{self.name} ({type_str})"
    
    def save(self, *args, **kwargs):
        """Auto-generate discount code if not provided"""
        if not self.code:
            # Generate format: DISC-XXXXXX
            import random
            import string
            
            while True:
                code = 'DISC-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                if not DiscountRule.objects.filter(code=code).exists():
                    self.code = code
                    break
        
        super().save(*args, **kwargs)
    
    def is_valid_on(self, date):
        """Check if discount is valid on a specific date"""
        if not self.is_active:
            return False
        if date < self.start_date or date > self.end_date:
            return False
        if self.max_total_usage > 0 and self.usage_count >= self.max_total_usage:
            return False
        return True
    
    def can_be_used_by(self, party):
        """Check if party can use this discount"""
        if not self.is_active:
            return False
        
        if self.max_usage_per_customer > 0:
            usage = DiscountApplication.objects.filter(
                discount_rule=self,
                party=party
            ).count()
            
            if usage >= self.max_usage_per_customer:
                return False
        
        return True
    
    def calculate_discount_amount(self, base_amount):
        """Calculate discount amount for a given base amount"""
        if self.discount_type == DiscountType.FIXED:
            return min(self.discount_value, base_amount)
        else:  # PERCENTAGE
            return base_amount * (self.discount_value / Decimal('100'))
    
    def clean(self):
        """Validate discount rule"""
        if self.end_date <= self.start_date:
            raise ValidationError("End date must be after start date")
        
        if self.discount_type == DiscountType.PERCENTAGE and self.discount_value > 100:
            raise ValidationError("Percentage discount cannot exceed 100%")


class DiscountApplication(CompanyScopedModel):
    """
    Audit trail of applied discounts.
    
    Tracks when and where discounts were applied for reporting and usage limits.
    """
    discount_rule = models.ForeignKey(
        DiscountRule,
        on_delete=models.PROTECT,
        related_name='applications',
        help_text="Discount rule that was applied"
    )
    party = models.ForeignKey(
        'party.Party',
        on_delete=models.PROTECT,
        related_name='discount_applications',
        help_text="Customer who received the discount"
    )
    
    # Applied to (one of these should be set)
    subscription = models.ForeignKey(
        Subscription,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='discount_applications',
        help_text="Subscription this discount was applied to"
    )
    invoice = models.ForeignKey(
        'invoice.Invoice',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='discount_applications',
        help_text="Invoice this discount was applied to"
    )
    
    # Discount details (captured at time of application)
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="Actual discount amount applied"
    )
    original_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="Original amount before discount"
    )
    final_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="Final amount after discount"
    )
    
    # Tracking
    applied_on = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When discount was applied"
    )
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='applied_discounts',
        help_text="User who applied the discount"
    )
    
    class Meta:
        verbose_name = "Discount Application"
        verbose_name_plural = "Discount Applications"
        ordering = ['-applied_on']
        indexes = [
            models.Index(fields=['company', 'party', 'applied_on']),
            models.Index(fields=['company', 'discount_rule']),
            models.Index(fields=['applied_on']),
        ]
    
    def __str__(self):
        target = self.subscription or self.invoice
        return f"{self.discount_rule.name} → {target} (${self.discount_amount})"
    
    def clean(self):
        """Validate discount application"""
        if not self.subscription and not self.invoice:
            raise ValidationError("Discount must be applied to either a subscription or an invoice")
        
        if self.subscription and self.invoice:
            raise ValidationError("Discount cannot be applied to both subscription and invoice")
