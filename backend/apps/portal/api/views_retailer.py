"""
Retailer registration and management APIs.
Handles retailer onboarding, approval workflow, and company discovery.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.db.models import Q

from core.permissions.base import RolePermission
from apps.party.models import RetailerUser, Party, PartyAddress
from apps.company.models import Company

User = get_user_model()


# ================================================================
# RETAILER REGISTRATION (For already authenticated users)
# ================================================================
class RetailerRegisterView(APIView):
    """
    Endpoint for authenticated users to complete retailer profile.
    
    POST: Create retailer profile and optionally request company access
    Requires: Authenticated user (already registered via /users/register/)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Complete retailer profile for authenticated user.
        
        Body:
            company_id: Optional company UUID to request access (can be done later)
            business_name: Optional business/shop name
            address: Optional address details
                - address_line1
                - city
                - state
                - postal_code
                - country (default: IN)
        """
        data = request.data
        user = request.user
        
        try:
            # If company_id provided, verify company exists and request access
            company = None
            company_id = data.get('company_id')
            
            if company_id:
                try:
                    company = Company.objects.get(id=company_id, is_active=True)
                except Company.DoesNotExist:
                    return Response(
                        {'error': 'Company not found or inactive'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Check if already registered for this company
                existing = RetailerUser.objects.filter(
                    user=user,
                    company=company
                ).first()
                
                if existing:
                    return Response(
                        {
                            'error': f'Already registered for this company',
                            'status': existing.status
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Update user's selected_role to RETAILER if not set
            if not user.selected_role:
                user.selected_role = 'RETAILER'
                user.is_portal_user = True
                user.save()
            
            response_data = {
                'detail': 'Retailer profile updated',
                'user_id': str(user.id),
                'email': user.email,
                'phone': user.phone,
            }
            
            # Create retailer mapping if company provided
            if company:
                retailer_user = RetailerUser.objects.create(
                    user=user,
                    company=company,
                    status='PENDING'
                )
                response_data.update({
                    'retailer_user_id': str(retailer_user.id),
                    'company_name': company.name,
                    'company_id': str(company.id),
                    'status': 'PENDING',
                    'message': f'Your request to access {company.name} has been submitted. An administrator will review your request.'
                })
            else:
                response_data.update({
                    'message': 'Profile updated. You can discover and request access to companies later.'
                })
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except DjangoValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ================================================================
# RETAILER PROFILE VIEW/UPDATE
# ================================================================
class RetailerProfileView(APIView):
    """
    View and update retailer profile with full details including address.
    
    GET: Fetch complete retailer profile with Party/Address data
    PATCH: Update retailer profile fields
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get full retailer profile including linked party/address info.
        
        Returns:
            id, username, email, first_name, last_name, phone,
            company_name, address, city, state, country, postal_code
        """
        user = request.user
        
        # Base profile from User model
        profile_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone or '',
            'company_name': '',
            'address': '',
            'city': '',
            'state': '',
            'country': '',
            'postal_code': ''
        }
        
        # Try to get retailer mappings and party info
        try:
            # Get first approved retailer mapping with party
            retailer_user = RetailerUser.objects.filter(
                user=user,
                status='APPROVED'
            ).select_related('party', 'company').first()
            
            if not retailer_user:
                # Fall back to any retailer mapping
                retailer_user = RetailerUser.objects.filter(
                    user=user
                ).select_related('party', 'company').first()
            
            if retailer_user:
                # Get company name
                if retailer_user.company:
                    profile_data['company_name'] = retailer_user.company.name
                
                # Get address from party if available
                if retailer_user.party:
                    party = retailer_user.party
                    # Get primary or first address
                    address = party.addresses.filter(is_default=True).first()
                    if not address:
                        address = party.addresses.first()
                    
                    if address:
                        profile_data['address'] = address.line1 + (f', {address.line2}' if address.line2 else '')
                        profile_data['city'] = address.city
                        profile_data['state'] = address.state
                        profile_data['country'] = address.country
                        profile_data['postal_code'] = address.pincode
            
            # Fallback: Also check RetailerCompanyAccess if company_name still empty
            if not profile_data['company_name']:
                from apps.portal.models import RetailerCompanyAccess
                access = RetailerCompanyAccess.objects.filter(
                    retailer__user=user,
                    status='APPROVED'
                ).select_related('company').first()
                
                if not access:
                    # Try any access request
                    access = RetailerCompanyAccess.objects.filter(
                        retailer__user=user
                    ).select_related('company').first()
                
                if access and access.company:
                    profile_data['company_name'] = access.company.name
                    
        except Exception as e:
            # Log error but continue with base profile
            print(f"Error fetching retailer details: {e}")
        
        return Response(profile_data, status=status.HTTP_200_OK)
    
    def patch(self, request):
        """
        Update retailer profile fields.
        
        Updatable fields:
            first_name, last_name, phone
            (Address updates require party to be set up)
        """
        user = request.user
        data = request.data
        updated_fields = []
        
        try:
            # Update user fields
            if 'first_name' in data:
                user.first_name = data['first_name']
                updated_fields.append('first_name')
            if 'last_name' in data:
                user.last_name = data['last_name']
                updated_fields.append('last_name')
            if 'phone' in data:
                user.phone = data['phone']
                updated_fields.append('phone')
            
            if updated_fields:
                user.save(update_fields=updated_fields)
            
            return Response({
                'detail': 'Profile updated successfully',
                'updated_fields': updated_fields
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Profile update failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ================================================================
# RETAILER PROFILE COMPLETION (with address)
# ================================================================
class RetailerCompleteProfileView(APIView):
    """
    Complete retailer profile with business address.
    Called after registration to add business details.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Complete retailer profile with business address.
        
        Body:
            company_id: Optional company UUID to request access
            business_name: Optional business/shop name
            address: Address details
                - address_line1 (required)
                - city (required)
                - state (required)
                - postal_code (required)
                - country (default: IN)
        """
        data = request.data
        user = request.user
        
        try:
            # Update user's role to RETAILER
            if not user.selected_role:
                user.selected_role = 'RETAILER'
            user.is_portal_user = True
            user.save()
            
            response_data = {
                'detail': 'Retailer profile completed',
                'user_id': str(user.id),
                'email': user.email,
                'phone': user.phone,
            }
            
            # Handle company access request if company_id provided
            company = None
            company_id = data.get('company_id')
            
            if company_id:
                try:
                    company = Company.objects.get(id=company_id, is_active=True)
                except Company.DoesNotExist:
                    return Response(
                        {'error': 'Company not found or inactive'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Check if already registered for this company
                existing = RetailerUser.objects.filter(
                    user=user,
                    company=company
                ).first()
                
                if not existing:
                    retailer_user = RetailerUser.objects.create(
                        user=user,
                        company=company,
                        status='PENDING'
                    )
                    response_data.update({
                        'retailer_user_id': str(retailer_user.id),
                        'company_name': company.name,
                        'company_id': str(company.id),
                        'status': 'PENDING',
                        'message': f'Profile completed. Your request to access {company.name} is pending approval.'
                    })
                else:
                    response_data.update({
                        'retailer_user_id': str(existing.id),
                        'company_name': company.name,
                        'company_id': str(company.id),
                        'status': existing.status,
                        'message': f'Profile completed. You already have a request for {company.name} with status: {existing.status}'
                    })
            else:
                response_data.update({
                    'message': 'Profile completed. You can discover and request access to companies later.'
                })
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Profile completion failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ================================================================
# RETAILER APPROVAL (Admin)
# ================================================================
class RetailerApproveView(APIView):
    """
    Admin endpoint to approve/reject retailer access requests.
    
    POST: Approve retailer access
    Requires: ADMIN or OWNER role
    """
    permission_classes = [IsAuthenticated, RolePermission.require(['ADMIN', 'OWNER'])]
    
    def post(self, request, retailer_id):
        """
        Approve retailer access request.
        
        Body:
            party_id: Optional party ID to link retailer to existing customer
            create_party: If true and no party_id, create new party
        """
        company = request.company
        
        try:
            # Get retailer user with company scoping
            retailer_user = RetailerUser.objects.select_related(
                'user', 'company'
            ).get(id=retailer_id, company=company)
            
            # Check current status
            if retailer_user.status == 'APPROVED':
                return Response(
                    {'error': 'Retailer already approved'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Link to party if provided or create new
            # Default to creating a party so the retailer always appears
            # in customer dropdowns (subscriptions, etc.)
            party_id = request.data.get('party_id')
            create_party = request.data.get('create_party', True)
            
            if party_id:
                # Link to existing party
                party = Party.objects.get(id=party_id, company=company)
                retailer_user.party = party
            elif create_party:
                # Create new party for retailer
                from apps.accounting.models import Ledger, AccountGroup
                from apps.company.models import FinancialYear
                
                # Get current financial year for the company
                current_fy = FinancialYear.objects.filter(
                    company=company,
                    is_current=True
                ).first()
                
                # Get or create Sundry Debtors group
                debtors_group = AccountGroup.objects.filter(
                    company=company,
                    name__icontains='sundry debtor'
                ).first()
                
                if not debtors_group:
                    debtors_group = AccountGroup.objects.filter(
                        company=company,
                        nature='ASSET'
                    ).first()
                
                # Create ledger for party only if both group and financial year exist
                ledger = None
                if debtors_group and current_fy:
                    # Generate unique code
                    import uuid
                    ledger_code = f"RET-{str(uuid.uuid4())[:8]}"
                    
                    ledger = Ledger.objects.create(
                        company=company,
                        name=f"{retailer_user.user.email} (Retailer)",
                        code=ledger_code,
                        group=debtors_group,
                        account_type='CUSTOMER',
                        opening_balance_fy=current_fy,
                        opening_balance=0,
                        opening_balance_type='DR'
                    )
                
                # Create party
                party = Party.objects.create(
                    company=company,
                    name=retailer_user.user.get_full_name() or retailer_user.user.email,
                    party_type='CUSTOMER',
                    ledger=ledger,
                    email=retailer_user.user.email,
                    phone=request.data.get('phone', ''),
                    is_retailer=True,
                    created_by=request.user
                )
                retailer_user.party = party
            
            # Update party credit limit and payment terms if provided
            credit_limit = request.data.get('credit_limit')
            payment_terms = request.data.get('payment_terms', '')
            
            if retailer_user.party:
                if credit_limit is not None:
                    from decimal import Decimal
                    retailer_user.party.credit_limit = Decimal(str(credit_limit))
                
                # Parse payment terms to get credit_days
                if payment_terms:
                    # Try to extract days from format like "Net 30 days" or just "30"
                    import re
                    days_match = re.search(r'(\d+)', payment_terms)
                    if days_match:
                        retailer_user.party.credit_days = int(days_match.group(1))
                
                retailer_user.party.save(update_fields=['credit_limit', 'credit_days'])
            
            # Approve access
            retailer_user.status = 'APPROVED'
            retailer_user.approved_by = request.user
            retailer_user.approved_at = timezone.now()
            retailer_user.save(update_fields=['status', 'approved_by', 'approved_at', 'party'])
            
            # Update or create RetailerCompanyAccess record
            from apps.portal.models import RetailerCompanyAccess
            access, created = RetailerCompanyAccess.objects.get_or_create(
                retailer=retailer_user,
                company=company,
                defaults={
                    'status': 'APPROVED',
                    'approved_by': request.user,
                    'approved_at': timezone.now(),
                }
            )
            if not created:
                access.status = 'APPROVED'
                access.approved_by = request.user
                access.approved_at = timezone.now()
                access.save(update_fields=['status', 'approved_by', 'approved_at'])
            
            return Response({
                'detail': 'Retailer approved successfully',
                'retailer_user_id': str(retailer_user.id),
                'user_email': retailer_user.user.email,
                'status': 'APPROVED',
                'party_id': str(retailer_user.party.id) if retailer_user.party else None,
                'credit_limit': str(retailer_user.party.credit_limit) if retailer_user.party else '0',
                'payment_terms': f"Net {retailer_user.party.credit_days} days" if retailer_user.party and retailer_user.party.credit_days else 'Net 30 days'
            })
            
        except RetailerUser.DoesNotExist:
            return Response(
                {'error': 'Retailer user not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Party.DoesNotExist:
            return Response(
                {'error': 'Party not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Approval failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RetailerRejectView(APIView):
    """
    Admin endpoint to reject retailer access requests.
    
    POST: Reject retailer access
    Requires: ADMIN or OWNER role
    """
    permission_classes = [IsAuthenticated, RolePermission.require(['ADMIN', 'OWNER'])]
    
    def post(self, request, retailer_id):
        """
        Reject retailer access request.
        
        Body:
            reason: Reason for rejection
        """
        company = request.company
        reason = request.data.get('reason', '')
        
        try:
            retailer_user = RetailerUser.objects.get(id=retailer_id, company=company)
            
            if retailer_user.status == 'REJECTED':
                return Response(
                    {'error': 'Retailer already rejected'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            retailer_user.status = 'REJECTED'
            retailer_user.rejection_reason = reason
            retailer_user.save(update_fields=['status', 'rejection_reason'])
            
            return Response({
                'detail': 'Retailer access rejected',
                'retailer_user_id': str(retailer_user.id),
                'status': 'REJECTED'
            })
            
        except RetailerUser.DoesNotExist:
            return Response(
                {'error': 'Retailer user not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class RetailerListView(APIView):
    """
    Admin endpoint to list retailer access requests.
    
    GET: List all retailer users for company
    Requires: ADMIN or ACCOUNTANT role (OWNER also allowed)
    """
    permission_classes = [IsAuthenticated, RolePermission.require(['ADMIN', 'ACCOUNTANT', 'OWNER'])]
    
    def get(self, request):
        """List retailer users with optional status filter."""
        company = request.company
        filter_status = request.query_params.get('status')
        
        qs = RetailerUser.objects.filter(company=company).select_related(
            'user', 'party', 'approved_by'
        ).prefetch_related('party__addresses').order_by('-created_at')
        
        if filter_status:
            qs = qs.filter(status=filter_status)
        
        data = []
        for ru in qs:
            # Get address from party if available
            address = ''
            if ru.party:
                party_address = ru.party.addresses.filter(is_default=True).first()
                if not party_address:
                    party_address = ru.party.addresses.first()
                if party_address:
                    address = f"{party_address.line1}, {party_address.city}, {party_address.state}"
            
            # Get request notes from RetailerCompanyAccess if exists
            notes = ''
            from apps.portal.models import RetailerCompanyAccess
            access = RetailerCompanyAccess.objects.filter(retailer=ru, company=company).first()
            if access:
                notes = access.notes or ''
            
            data.append({
                'id': str(ru.id),
                'user': {
                    'id': str(ru.user.id),
                    'email': ru.user.email,
                    'full_name': ru.user.get_full_name()
                },
                'user_id': str(ru.user.id),
                'user_name': ru.user.get_full_name() or ru.user.email,
                'user_email': ru.user.email,
                'party': {
                    'id': str(ru.party.id),
                    'name': ru.party.name
                } if ru.party else None,
                'party_id': str(ru.party.id) if ru.party else None,
                'party_name': ru.party.name if ru.party else '',
                'business_name': ru.party.name if ru.party else ru.user.get_full_name() or ru.user.email,
                'address': address,
                'status': ru.status,
                'notes': notes,
                'approved_by': ru.approved_by.email if ru.approved_by else None,
                'approved_at': ru.approved_at.isoformat() if ru.approved_at else None,
                'rejection_reason': ru.rejection_reason,
                'created_at': ru.created_at.isoformat(),
                'credit_limit': str(ru.party.credit_limit) if ru.party else '0',
                'payment_terms': f"Net {ru.party.credit_days} days" if ru.party and ru.party.credit_days else 'Net 30 days'
            })
        
        return Response(data)


# ================================================================
# COMPANY DISCOVERY (Public)
# ================================================================
class CompanyDiscoveryView(APIView):
    """
    Public endpoint for retailers to discover companies.
    
    GET: Search companies by name, city, or category
    No authentication required
    """
    authentication_classes = []
    permission_classes = []
    
    def get(self, request):
        """
        Search for companies.
        
        Query params:
            q: Search query (searches name)
            city: Filter by city
            category: Filter by business category
        """
        query = request.query_params.get('q', '').strip()
        city = request.query_params.get('city', '').strip()
        category = request.query_params.get('category', '').strip()
        
        qs = Company.objects.filter(is_active=True)
        
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(business_name__icontains=query)
            )
        
        if city:
            qs = qs.filter(city__icontains=city)
        
        if category:
            qs = qs.filter(business_category__icontains=category)
        
        # Limit results
        qs = qs[:50]
        
        data = [{
            'id': str(c.id),
            'name': c.name,
            'business_name': c.business_name if hasattr(c, 'business_name') else c.name,
            'city': c.city if hasattr(c, 'city') else None,
            'state': c.state if hasattr(c, 'state') else None,
            'gstin': c.gstin if hasattr(c, 'gstin') else None
        } for c in qs]
        
        return Response(data)
