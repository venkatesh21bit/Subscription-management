"""
Pricing API URL routing.
"""
from django.urls import path
from apps.pricing.api.views import (
    ItemPricingView,
    BulkItemPricingView
)
from apps.pricing.api.config_views import (
    TaxListCreateView,
    TaxDetailView
)

urlpatterns = [
    path('items/<uuid:item_id>/', ItemPricingView.as_view(), name='item-pricing'),
    path('items/bulk/', BulkItemPricingView.as_view(), name='bulk-item-pricing'),
    
    # Configuration endpoints
    path('taxes/', TaxListCreateView.as_view(), name='tax-list-create'),
    path('taxes/<uuid:tax_id>/', TaxDetailView.as_view(), name='tax-detail'),
]
