"""
Party API Views

Endpoints for party management and credit control.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from core.permissions.base import HasCompanyContext, RolePermission
from apps.party.models import Party
from apps.party.services.credit import get_credit_status, can_create_order, get_overdue_amount
from decimal import Decimal


class PartyCreditStatusView(APIView):
    """
    Get credit status for a party.
    
    GET /api/party/<uuid:party_id>/credit_status/
    
    Returns comprehensive credit information:
    - Credit limit
    - Outstanding amount
    - Available credit
    - Utilization percentage
    - Status (OK, WARNING, EXCEEDED, NO_LIMIT)
    - Overdue amount
    
    Response:
    {
        "party_id": "uuid",
        "party_name": "ABC Retailers",
        "credit_limit": "50000.00",
        "outstanding": "40000.00",
        "available": "10000.00",
        "utilization_percent": 80.0,
        "status": "WARNING",
        "overdue_amount": "5000.00",
        "message": "Credit utilization is high. Consider payment before next order."
    }
    
    All authenticated users can view credit status (company-scoped).
    """
    permission_classes = [IsAuthenticated, HasCompanyContext]
    
    def get(self, request, party_id):
        """Get credit status for party."""
        party = get_object_or_404(
            Party,
            id=party_id,
            company=request.company
        )
        
        # Get credit status
        credit_status = get_credit_status(party)
        
        # Add overdue amount
        credit_status['overdue_amount'] = str(get_overdue_amount(party))
        
        # Add contextual message
        status_value = credit_status['status']
        if status_value == 'EXCEEDED':
            credit_status['message'] = "Credit limit exceeded. Payment required before placing new orders."
        elif status_value == 'WARNING':
            credit_status['message'] = "Credit utilization is high. Consider payment before next order."
        elif status_value == 'OK':
            credit_status['message'] = "Credit available for new orders."
        else:
            credit_status['message'] = "No credit limit set."
        
        return Response(credit_status, status=status.HTTP_200_OK)


class PartyCanOrderView(APIView):
    """
    Check if party can place a new order.
    
    POST /api/party/<uuid:party_id>/can_order/
    
    Request:
    {
        "order_value": 15000.00
    }
    
    Response:
    {
        "allowed": true,
        "reason": "Credit available",
        "credit_status": {
            "credit_limit": "50000.00",
            "outstanding": "40000.00",
            "available": "10000.00",
            "utilization_percent": 80.0,
            "status": "WARNING"
        }
    }
    
    OR
    
    {
        "allowed": false,
        "reason": "Credit limit exceeded. Limit: ₹50000, Outstanding: ₹45000, New Order: ₹10000, Total: ₹55000",
        "credit_status": {...}
    }
    
    Useful for:
    - Pre-order validation
    - UI feedback before order creation
    - Portal order placement checks
    """
    permission_classes = [IsAuthenticated, HasCompanyContext]
    
    def post(self, request, party_id):
        """Check if party can create order."""
        party = get_object_or_404(
            Party,
            id=party_id,
            company=request.company
        )
        
        # Get order value
        order_value = request.data.get('order_value')
        if not order_value:
            return Response(
                {"error": "order_value is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order_value = Decimal(str(order_value))
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid order_value format"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if order can be created
        result = can_create_order(party, order_value)
        
        return Response(result, status=status.HTTP_200_OK)


class PartyListView(APIView):
    """
    List all parties for the company.
    
    GET /api/party/
    
    Optional query parameters:
    - party_type: Filter by type (CUSTOMER, SUPPLIER, EMPLOYEE)
    - is_retailer: Filter retailers (true/false)
    - search: Search by name
    
    Response:
    {
        "parties": [
            {
                "id": "uuid",
                "name": "ABC Retailers",
                "party_type": "CUSTOMER",
                "is_retailer": true,
                "credit_limit": "50000.00",
                "phone": "+91-9876543210",
                "email": "contact@abc.com",
                "is_active": true
            }
        ]
    }
    """
    permission_classes = [IsAuthenticated, HasCompanyContext]
    
    def get(self, request):
        """List parties, auto-syncing approved retailers that lack a Party record."""
        company = request.company
        
        # Auto-create Party records for approved retailers that don't have one
        self._sync_retailer_parties(company)
        
        qs = Party.objects.filter(company=company)
        
        # Apply filters
        party_type = request.query_params.get('party_type')
        if party_type:
            qs = qs.filter(party_type=party_type)
        
        is_retailer = request.query_params.get('is_retailer')
        if is_retailer:
            qs = qs.filter(is_retailer=is_retailer.lower() == 'true')
        
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        
        parties = [
            {
                'id': str(p.id),
                'name': p.name,
                'party_type': p.party_type,
                'is_retailer': p.is_retailer,
                'credit_limit': str(p.credit_limit) if p.credit_limit else None,
                'phone': p.phone,
                'email': p.email,
                'is_active': p.is_active
            }
            for p in qs.order_by('name')
        ]
        
        return Response({'parties': parties}, status=status.HTTP_200_OK)

    def _sync_retailer_parties(self, company):
        """Create Party records for approved retailers missing one."""
        from apps.party.models import RetailerUser
        
        # Find approved retailers in this company without a party
        retailers_without_party = RetailerUser.objects.filter(
            company=company,
            status='APPROVED',
            party__isnull=True
        ).select_related('user')
        
        for retailer in retailers_without_party:
            user = retailer.user
            # Check if a party already exists for this email
            existing_party = Party.objects.filter(
                company=company,
                email=user.email
            ).first()
            
            if existing_party:
                retailer.party = existing_party
                retailer.save(update_fields=['party'])
            else:
                party = Party.objects.create(
                    company=company,
                    name=user.get_full_name() or user.email,
                    party_type='CUSTOMER',
                    email=user.email,
                    phone=user.phone or '',
                    is_retailer=True
                )
                retailer.party = party
                retailer.save(update_fields=['party'])
