"""
Company connection APIs for retailer-manufacturer relationships.
Handles company code generation and retailer connections.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from apps.company.models import Company, CompanyUser
from apps.portal.models import RetailerCompanyAccess
from apps.party.models import Party, RetailerUser


class GenerateCompanyCodeView(APIView):
    """
    Generate or retrieve company code for retailers to join.
    Manufacturers use this to get their company code to share with retailers.
    
    GET /company/connection/generate-code/
    
    Response:
    {
        "company_code": "ABC001",
        "company_name": "ABC Manufacturing",
        "message": "Share this code with retailers to allow them to connect to your company"
    }
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get company code for manufacturer's active company."""
        user = request.user
        
        # Get user's active company (use filter().first() to handle multiple records)
        company_user = CompanyUser.objects.select_related('company').filter(
            user=user,
            is_active=True,
            is_default=True
        ).first()
        
        if not company_user:
            # Fallback: get any active company membership
            company_user = CompanyUser.objects.select_related('company').filter(
                user=user,
                is_active=True
            ).first()
        
        if not company_user:
            return Response(
                {
                    "error": "No active company found for this user",
                    "detail": "Please create or select a company first"
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        company = company_user.company
        return Response({
            "company_code": company.code,
            "company_name": company.name,
            "company_id": str(company.id),
            "message": "Share this code with retailers to allow them to connect to your company"
        })


class JoinByCompanyCodeView(APIView):
    """
    Retailer joins a company using company code.
    
    POST /retailer/join-by-company-code/
    
    Request:
    {
        "company_code": "ABC001"
    }
    
    Response:
    {
        "message": "Successfully connected to company",
        "connection": {
            "id": "uuid",
            "company_id": "uuid",
            "company_name": "ABC Manufacturing",
            "status": "APPROVED",
            "connected_at": "2026-02-01T..."
        }
    }
    """
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        """Join company by code."""
        user = request.user
        company_code = request.data.get('company_code', '').strip().upper()
        
        if not company_code:
            return Response(
                {"error": "Company code is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify user is a retailer
        if user.selected_role != 'RETAILER':
            return Response(
                {
                    "error": "Only retailers can join companies using company code",
                    "current_role": user.selected_role
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Find company by code
        try:
            company = Company.objects.get(code=company_code, is_active=True, is_deleted=False)
        except Company.DoesNotExist:
            return Response(
                {"error": f"No active company found with code '{company_code}'"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create retailer user for this specific company
        try:
            retailer = RetailerUser.objects.get(user=user, company=company)
        except RetailerUser.DoesNotExist:
            # Create retailer profile if doesn't exist
            # First, check if user has a party
            party = Party.objects.filter(
                company=company,
                email=user.email
            ).first()
            
            if not party:
                # Create a new party for the retailer
                from apps.accounting.models import Ledger, AccountGroup
                from apps.company.models import FinancialYear
                
                ledger = None
                
                # Get current financial year for the company
                current_fy = FinancialYear.objects.filter(
                    company=company,
                    is_current=True
                ).first()
                
                # Try to create a ledger if AccountGroup and FinancialYear exist
                debtors_group = AccountGroup.objects.filter(
                    company=company,
                    name__icontains='sundry debtor'
                ).first()
                
                if not debtors_group:
                    debtors_group = AccountGroup.objects.filter(
                        company=company,
                        nature='ASSET'
                    ).first()
                
                # Only create ledger if we have both a valid group and financial year
                if debtors_group and current_fy:
                    # Generate unique code
                    import uuid
                    ledger_code = f"RET-{str(uuid.uuid4())[:8]}"
                    
                    ledger = Ledger.objects.create(
                        company=company,
                        name=f"{user.get_full_name() or user.email} (Retailer)",
                        code=ledger_code,
                        group=debtors_group,
                        account_type='CUSTOMER',
                        opening_balance_fy=current_fy,
                        opening_balance=0,
                        opening_balance_type='DR'
                    )
                
                # Create party (ledger can be null)
                party = Party.objects.create(
                    company=company,
                    name=user.get_full_name() or user.email,
                    party_type='CUSTOMER',
                    ledger=ledger,
                    email=user.email,
                    phone=user.phone or '',
                    is_retailer=True
                )
            
            retailer = RetailerUser.objects.create(
                user=user,
                company=company,
                party=party
            )
        
        # Check if connection already exists
        existing_access = RetailerCompanyAccess.objects.filter(
            retailer=retailer,
            company=company
        ).first()
        
        if existing_access:
            return Response(
                {
                    "error": "You are already connected to this company",
                    "status": existing_access.status,
                    "connection_id": str(existing_access.id)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create pending connection request
        # Get optional message from request (handle None from JSON)
        message = request.data.get('message') or ''
        message = message.strip() if message else ''
        notes = message if message else f"Request to join via company code: {company_code}"
        
        connection = RetailerCompanyAccess.objects.create(
            retailer=retailer,
            company=company,
            status='PENDING',
            notes=notes
        )
        
        return Response({
            "message": f"Request sent to {company.name}. Please wait for approval.",
            "connection": {
                "id": str(connection.id),
                "company_id": str(company.id),
                "company_name": company.name,
                "company_code": company.code,
                "status": connection.status,
                "connected_at": connection.created_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)


class RetailerCompanyListView(APIView):
    """
    Get list of companies the retailer is connected to.
    
    GET /retailer/companies/
    
    Response:
    [
        {
            "id": "uuid",
            "company_id": "uuid",
            "company_name": "ABC Manufacturing",
            "company_code": "ABC001",
            "status": "APPROVED",
            "connected_at": "2026-02-01T...",
            "credit_limit": "50000.00",
            "payment_terms": "Net 30 days"
        }
    ]
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List connected companies for retailer."""
        user = request.user
        
        # Get all retailer profiles for this user (one per company)
        retailer_users = RetailerUser.objects.filter(user=user).select_related(
            'company', 'party'
        )
        
        if not retailer_users.exists():
            return Response([], status=status.HTTP_200_OK)
        
        # Build response data from RetailerUser (which has party with credit_limit)
        data = []
        
        # Filter by status if provided
        filter_status = request.query_params.get('status')
        
        for ru in retailer_users:
            # Apply status filter if provided
            if filter_status and ru.status != filter_status.upper():
                continue
            
            # Get credit_limit from party if exists
            credit_limit = '0'
            payment_terms = 'Net 30 days'
            if ru.party:
                credit_limit = str(ru.party.credit_limit) if ru.party.credit_limit else '0'
                if ru.party.credit_days:
                    payment_terms = f"Net {ru.party.credit_days} days"
            
            data.append({
                "id": str(ru.id),
                "company_id": str(ru.company.id),
                "company_name": ru.company.name,
                "company_code": ru.company.code,
                "status": ru.status,
                "connected_at": ru.approved_at.isoformat() if ru.approved_at else ru.created_at.isoformat(),
                "notes": "",  # RetailerUser doesn't have notes, it's in RetailerCompanyAccess
                "credit_limit": credit_limit,
                "payment_terms": payment_terms
            })
        
        # Sort by connected_at descending
        data.sort(key=lambda x: x['connected_at'], reverse=True)
        
        return Response(data)

