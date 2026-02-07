"""
Admin configuration for subscription models.
"""
from django.contrib import admin
from .models import (
    SubscriptionPlan,
    PlanProduct,
    Subscription,
    SubscriptionItem,
    ProductAttribute,
    ProductVariant,
    Quotation,
    QuotationTemplate,
    QuotationItem,
    DiscountRule,
    DiscountApplication,
)


class PlanProductInline(admin.TabularInline):
    model = PlanProduct
    extra = 1
    # autocomplete_fields = ['product', 'product_variant']  # Commented out - requires search_fields in Product admin


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'billing_interval', 'billing_interval_count', 'base_price', 'is_active', 'created_at']
    list_filter = ['company', 'billing_interval', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    inlines = [PlanProductInline]
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'name', 'description', 'is_active')
        }),
        ('Billing Configuration', {
            'fields': ('billing_interval', 'billing_interval_count', 'base_price', 'setup_fee', 'trial_period_days')
        }),
        ('Plan Options', {
            'fields': ('is_auto_closable', 'is_closable', 'is_pausable', 'is_renewable')
        }),
        ('Validity', {
            'fields': ('start_date', 'end_date', 'min_quantity')
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class SubscriptionItemInline(admin.TabularInline):
    model = SubscriptionItem
    extra = 1
    # autocomplete_fields = ['product', 'product_variant']  # Commented out - requires search_fields in Product admin


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['subscription_number', 'party', 'plan', 'status', 'start_date', 'next_billing_date', 'monthly_value', 'created_at']
    list_filter = ['company', 'status', 'start_date', 'created_at']
    search_fields = ['subscription_number', 'party__name']
    inlines = [SubscriptionItemInline]
    readonly_fields = ['id', 'subscription_number', 'monthly_value', 'confirmed_at', 'activated_at', 'cancelled_at', 'closed_at', 'created_at', 'updated_at']
    autocomplete_fields = ['plan']  # Removed 'party' and 'currency' - requires search_fields in their admins
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'subscription_number', 'party', 'plan', 'status')
        }),
        ('Billing Configuration', {
            'fields': ('start_date', 'end_date', 'next_billing_date', 'last_billing_date', 'billing_cycle_count', 'currency', 'monthly_value')
        }),
        ('Discounts', {
            'fields': ('discount_type', 'discount_value', 'discount_start', 'discount_end'),
            'classes': ('collapse',)
        }),
        ('Payment Terms', {
            'fields': ('payment_terms',)
        }),
        ('Lifecycle Tracking', {
            'fields': ('confirmed_at', 'activated_at', 'cancelled_at', 'cancellation_reason', 'closed_at'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('terms_and_conditions', 'notes'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ['product', 'name', 'get_values_display', 'created_at']
    list_filter = ['company', 'created_at']
    search_fields = ['product__name', 'name']
    # autocomplete_fields = ['product']  # Commented out - requires search_fields in Product admin
    
    def get_values_display(self, obj):
        return ', '.join(obj.values[:5])  # Show first 5 values
    get_values_display.short_description = 'Values'


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['sku', 'product', 'get_attributes_display', 'base_price', 'is_active', 'created_at']
    list_filter = ['company', 'is_active', 'created_at']
    search_fields = ['sku', 'product__name']
    # autocomplete_fields = ['product', 'stock_item']  # Commented out - requires search_fields in their admins
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def get_attributes_display(self, obj):
        return ', '.join([f"{k}={v}" for k, v in obj.attributes.items()])
    get_attributes_display.short_description = 'Attributes'


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 1
    # autocomplete_fields = ['product', 'product_variant']  # Commented out - requires search_fields in Product admin


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['quotation_number', 'party', 'plan', 'status', 'valid_until', 'created_at']
    list_filter = ['company', 'status', 'created_at']
    search_fields = ['quotation_number', 'party__name']
    inlines = [QuotationItemInline]
    readonly_fields = ['id', 'quotation_number', 'total_amount', 'sent_at', 'accepted_at', 'rejected_at', 'created_at', 'updated_at']
    autocomplete_fields = ['plan', 'subscription', 'template']  # Removed 'party' - requires search_fields in Party admin
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'quotation_number', 'party', 'plan', 'status')
        }),
        ('Validity', {
            'fields': ('valid_until', 'start_date')
        }),
        ('Pricing', {
            'fields': ('total_amount', 'currency')
        }),
        ('Lifecycle', {
            'fields': ('sent_at', 'accepted_at', 'rejected_at', 'rejection_reason', 'subscription'),
            'classes': ('collapse',)
        }),
        ('Template', {
            'fields': ('template',),
            'classes': ('collapse',)
        }),
        ('Terms', {
            'fields': ('terms_and_conditions', 'notes'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(QuotationTemplate)
class QuotationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'plan', 'validity_days', 'is_active', 'created_at']
    list_filter = ['company', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    autocomplete_fields = ['plan']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_active', 'created_at']
    list_filter = ['company', 'discount_type', 'is_active', 'applies_to_products', 'applies_to_subscriptions', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['id', 'code', 'usage_count', 'created_at', 'updated_at']
    filter_horizontal = ['applicable_products']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'name', 'code', 'description', 'is_active')
        }),
        ('Discount Configuration', {
            'fields': ('discount_type', 'discount_value')
        }),
        ('Constraints', {
            'fields': ('min_purchase_amount', 'min_quantity', 'max_usage_per_customer', 'max_total_usage', 'usage_count')
        }),
        ('Validity', {
            'fields': ('start_date', 'end_date')
        }),
        ('Applicability', {
            'fields': ('applies_to_products', 'applies_to_subscriptions', 'applicable_products')
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DiscountApplication)
class DiscountApplicationAdmin(admin.ModelAdmin):
    list_display = ['discount_rule', 'party', 'subscription', 'applied_on', 'discount_amount']
    list_filter = ['company', 'applied_on']
    search_fields = ['discount_rule__name', 'party__name', 'subscription__subscription_number']
    readonly_fields = ['id', 'applied_on', 'created_at', 'updated_at']
    autocomplete_fields = ['discount_rule', 'subscription']  # Removed 'party' and 'invoice' - requires search_fields in their admins
