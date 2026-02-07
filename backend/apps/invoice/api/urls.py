"""
Invoice API URL routing.
Maps endpoints to views for invoice operations.
"""
from django.urls import path
from apps.invoice.api.views import (
    InvoiceFromSalesOrderView,
    InvoicePostingView,
    InvoiceOutstandingView,
    InvoiceListView,
    InvoiceDetailView,
    InvoiceConfirmView,
    InvoiceRecordPaymentView,
)

urlpatterns = [
    # Invoice generation from orders
    path('from_sales_order/<uuid:so_id>/', InvoiceFromSalesOrderView.as_view(), name='invoice-from-sales-order'),
    
    # Invoice posting (accounting)
    path('<uuid:invoice_id>/post_voucher/', InvoicePostingView.as_view(), name='invoice-post'),
    
    # Invoice confirm (DRAFT -> POSTED)
    path('<uuid:invoice_id>/confirm/', InvoiceConfirmView.as_view(), name='invoice-confirm'),
    
    # Record payment against invoice
    path('<uuid:invoice_id>/record-payment/', InvoiceRecordPaymentView.as_view(), name='invoice-record-payment'),
    
    # Outstanding invoices
    path('outstanding/', InvoiceOutstandingView.as_view(), name='invoice-outstanding'),
    
    # List and detail
    path('', InvoiceListView.as_view(), name='invoice-list'),
    path('<uuid:invoice_id>/', InvoiceDetailView.as_view(), name='invoice-detail'),
]
