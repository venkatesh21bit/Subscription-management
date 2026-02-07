import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

try:
    from apps.subscriptions.models import (
        Subscription, 
        SubscriptionPlan,
        SubscriptionItem,
        ProductVariant,
        ProductAttribute,
        Quotation,
        QuotationTemplate,
        DiscountRule,
        DiscountApplication
    )
    print("✓ All subscription models imported successfully!")
    print(f"  - SubscriptionPlan: {SubscriptionPlan}")
    print(f"  - Subscription: {Subscription}")
    print(f"  - SubscriptionItem: {SubscriptionItem}")
    print(f"  - ProductVariant: {ProductVariant}")
    print(f"  - ProductAttribute: {ProductAttribute}")
    print(f"  - Quotation: {Quotation}")
    print(f"  - QuotationTemplate: {QuotationTemplate}")
    print(f"  - DiscountRule: {DiscountRule}")
    print(f"  - DiscountApplication: {DiscountApplication}")
except Exception as e:
    print(f"✗ Error importing models: {e}")
    import traceback
    traceback.print_exc()
