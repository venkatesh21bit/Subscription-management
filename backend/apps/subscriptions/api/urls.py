"""
API URL routing for subscriptions.
Provides endpoints for subscription management, quotations, and recurring billing.
"""
from django.urls import path
from apps.subscriptions.api import views
from apps.subscriptions.api.config_views import (
    DiscountListCreateView,
    DiscountDetailView,
    AttributeListCreateView,
    AttributeDetailView,
    RecurringPlanListCreateView,
    RecurringPlanDetailView,
    QuotationTemplateListCreateView,
    QuotationTemplateDetailView as QuotationTemplateConfigDetailView
)

app_name = 'subscriptions'

urlpatterns = [
    # Subscription endpoints
    path('subscriptions/', views.SubscriptionListCreateView.as_view(), name='subscription-list-create'),
    path('subscriptions/<uuid:subscription_id>/', views.SubscriptionDetailView.as_view(), name='subscription-detail'),
    path('subscriptions/<uuid:subscription_id>/status/', views.SubscriptionStatusUpdateView.as_view(), name='subscription-status-update'),
    
    # Subscription items (order lines) endpoints
    path('subscriptions/<uuid:subscription_id>/items/', views.SubscriptionItemListCreateView.as_view(), name='subscription-item-list-create'),
    path('subscriptions/<uuid:subscription_id>/items/<uuid:item_id>/', views.SubscriptionItemDetailView.as_view(), name='subscription-item-detail'),
    
    # Subscription workflow: Create orders from subscriptions
    path('subscriptions/<uuid:subscription_id>/create-order/', views.SubscriptionCreateOrderView.as_view(), name='subscription-create-order'),
    path('subscriptions/<uuid:subscription_id>/orders/', views.SubscriptionOrderListView.as_view(), name='subscription-order-list'),
    
    # Subscription workflow: View invoices from subscriptions
    path('subscriptions/<uuid:subscription_id>/invoices/', views.SubscriptionInvoiceListView.as_view(), name='subscription-invoice-list'),
    
    # Order workflow: Create invoice from order
    path('orders/<uuid:order_id>/create-invoice/', views.OrderCreateInvoiceView.as_view(), name='order-create-invoice'),
    
    # Invoice workflow: Confirm invoice
    path('invoices/<uuid:invoice_id>/confirm/', views.InvoiceConfirmView.as_view(), name='invoice-confirm'),
    
    # Subscription plans
    path('plans/', views.SubscriptionPlanListView.as_view(), name='plan-list'),
    
    # Quotation templates (old endpoint)
    path('quotation-templates/', views.QuotationTemplateListView.as_view(), name='quotation-template-list'),
    
    # Quotations
    path('quotations/', views.QuotationListCreateView.as_view(), name='quotation-list-create'),
    path('quotations/<uuid:quotation_id>/', views.QuotationDetailView.as_view(), name='quotation-detail'),
    
    # Configuration endpoints
    path('discounts/', DiscountListCreateView.as_view(), name='discount-list-create'),
    path('discounts/<uuid:discount_id>/', DiscountDetailView.as_view(), name='discount-detail'),
    
    path('attributes/', AttributeListCreateView.as_view(), name='attribute-list-create'),
    path('attributes/<uuid:attribute_id>/', AttributeDetailView.as_view(), name='attribute-detail'),
    
    path('recurring-plans/', RecurringPlanListCreateView.as_view(), name='recurring-plan-list-create'),
    path('recurring-plans/<uuid:plan_id>/', RecurringPlanDetailView.as_view(), name='recurring-plan-detail'),
    
    path('quotation-templates-config/', QuotationTemplateListCreateView.as_view(), name='quotation-template-config-list-create'),
    path('quotation-templates-config/<uuid:template_id>/', QuotationTemplateConfigDetailView.as_view(), name='quotation-template-config-detail'),
]
