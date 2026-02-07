"""
API views for Subscriptions app.
Provides CRUD operations for Subscription management.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
from django.utils import timezone
from decimal import Decimal

from apps.subscriptions.models import (
    Subscription,
    SubscriptionItem,
    SubscriptionPlan,
    QuotationTemplate,
    Quotation,
    QuotationItem,
    SubscriptionStatus,
    QuotationStatus
)
from apps.orders.models import SalesOrder, OrderStatus
from apps.invoice.models import Invoice, InvoiceType, InvoiceStatus
from datetime import date, timedelta
from apps.subscriptions.api.serializers import (
    SubscriptionListSerializer,
    SubscriptionDetailSerializer,
    SubscriptionCreateUpdateSerializer,
    SubscriptionItemSerializer,
    SubscriptionPlanSerializer,
    QuotationTemplateSerializer,
    QuotationListSerializer,
    QuotationDetailSerializer
)


class SubscriptionListCreateView(APIView):
    """
    List all subscriptions or create a new one.
    
    GET: Returns all subscriptions for the company (first page UI)
    POST: Creates a new subscription
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        List all subscriptions with filtering and search.
        
        Query parameters:
        - status: Filter by status (DRAFT, ACTIVE, CANCELLED, etc.)
        - search: Search by subscription number, customer name
        - party: Filter by party ID
        - plan: Filter by plan ID
        """
        # Get base queryset with related data
        subscriptions = Subscription.objects.filter(
            company=request.company
        ).select_related(
            'party',
            'plan',
            'currency',
            'quotation_template'
        ).order_by('-created_at')
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            subscriptions = subscriptions.filter(status=status_filter)
        
        party_filter = request.query_params.get('party')
        if party_filter:
            subscriptions = subscriptions.filter(party_id=party_filter)
        
        plan_filter = request.query_params.get('plan')
        if plan_filter:
            subscriptions = subscriptions.filter(plan_id=plan_filter)
        
        # Search functionality
        search_query = request.query_params.get('search')
        if search_query:
            subscriptions = subscriptions.filter(
                Q(subscription_number__icontains=search_query) |
                Q(party__name__icontains=search_query)
            )
        
        # Serialize and return
        serializer = SubscriptionListSerializer(subscriptions, many=True)
        
        return Response({
            'subscriptions': serializer.data,
            'count': subscriptions.count()
        })
    
    def post(self, request):
        """
        Create a new subscription.
        """
        # Verify user has an active company
        if not request.company:
            return Response(
                {'error': 'No active company found. Please ensure you have a company assigned.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubscriptionCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            subscription = serializer.save(company=request.company)
            
            # Return detailed view of created subscription
            detail_serializer = SubscriptionDetailSerializer(subscription)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionDetailView(APIView):
    """
    Retrieve, update, or delete a subscription.
    
    GET: Returns subscription details with order lines (second page UI)
    PUT: Updates subscription
    PATCH: Partially updates subscription
    DELETE: Deletes subscription (if in DRAFT status)
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, subscription_id):
        """Get subscription ensuring company scope."""
        try:
            return Subscription.objects.select_related(
                'party',
                'plan',
                'currency',
                'quotation_template',
                'quotation_template__plan'
            ).prefetch_related(
                Prefetch(
                    'items',
                    queryset=SubscriptionItem.objects.select_related('product', 'product_variant')
                )
            ).get(id=subscription_id, company=request.company)
        except Subscription.DoesNotExist:
            return None
    
    def get(self, request, subscription_id):
        """
        Get subscription details with order lines.
        Matches the second page UI showing detailed view.
        """
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = SubscriptionDetailSerializer(subscription)
        return Response(serializer.data)
    
    def put(self, request, subscription_id):
        """Full update of subscription."""
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = SubscriptionCreateUpdateSerializer(subscription, data=request.data)
        if serializer.is_valid():
            serializer.save()
            detail_serializer = SubscriptionDetailSerializer(subscription)
            return Response(detail_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, subscription_id):
        """Partial update of subscription."""
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = SubscriptionCreateUpdateSerializer(
            subscription,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            detail_serializer = SubscriptionDetailSerializer(subscription)
            return Response(detail_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, subscription_id):
        """Delete subscription (only if in DRAFT status)."""
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Only allow deletion of draft subscriptions
        if subscription.status != SubscriptionStatus.DRAFT:
            return Response(
                {'error': 'Only draft subscriptions can be deleted. Use cancel instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subscription.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriptionItemListCreateView(APIView):
    """
    List or create subscription items (order lines) for a subscription.
    
    GET: Returns all items for a subscription
    POST: Adds a new item to the subscription
    """
    permission_classes = [IsAuthenticated]
    
    def get_subscription(self, request, subscription_id):
        """Get subscription ensuring company scope."""
        try:
            return Subscription.objects.get(id=subscription_id, company=request.company)
        except Subscription.DoesNotExist:
            return None
    
    def get(self, request, subscription_id):
        """List all items for a subscription."""
        subscription = self.get_subscription(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        items = SubscriptionItem.objects.filter(
            subscription=subscription
        ).select_related('product', 'product_variant')
        
        serializer = SubscriptionItemSerializer(items, many=True)
        return Response({
            'items': serializer.data,
            'count': items.count()
        })
    
    def post(self, request, subscription_id):
        """Add a new item to the subscription."""
        subscription = self.get_subscription(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if subscription is in a modifiable state
        if subscription.status not in [SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION]:
            return Response(
                {'error': 'Cannot modify items for subscriptions in this status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubscriptionItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(subscription=subscription)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionItemDetailView(APIView):
    """
    Retrieve, update, or delete a subscription item.
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, subscription_id, item_id):
        """Get subscription item ensuring company scope."""
        try:
            return SubscriptionItem.objects.select_related(
                'product', 'product_variant', 'subscription'
            ).get(
                id=item_id,
                subscription_id=subscription_id,
                subscription__company=request.company
            )
        except SubscriptionItem.DoesNotExist:
            return None
    
    def get(self, request, subscription_id, item_id):
        """Get item details."""
        item = self.get_object(request, subscription_id, item_id)
        if not item:
            return Response(
                {'error': 'Subscription item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = SubscriptionItemSerializer(item)
        return Response(serializer.data)
    
    def put(self, request, subscription_id, item_id):
        """Update subscription item."""
        item = self.get_object(request, subscription_id, item_id)
        if not item:
            return Response(
                {'error': 'Subscription item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if subscription is modifiable
        if item.subscription.status not in [SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION]:
            return Response(
                {'error': 'Cannot modify items for subscriptions in this status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubscriptionItemSerializer(item, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, subscription_id, item_id):
        """Delete subscription item."""
        item = self.get_object(request, subscription_id, item_id)
        if not item:
            return Response(
                {'error': 'Subscription item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if subscription is modifiable
        if item.subscription.status not in [SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION]:
            return Response(
                {'error': 'Cannot modify items for subscriptions in this status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriptionStatusUpdateView(APIView):
    """
    Update subscription status with specific actions.
    
    Handles workflow transitions:
    - confirm: DRAFT → CONFIRMED
    - activate: CONFIRMED → ACTIVE
    - pause: ACTIVE → PAUSED
    - resume: PAUSED → ACTIVE
    - cancel: ACTIVE/PAUSED → CANCELLED
    - close: CANCELLED/ACTIVE → CLOSED
    """
    permission_classes = [IsAuthenticated]
    
    def get_subscription(self, request, subscription_id):
        """Get subscription ensuring company scope."""
        try:
            return Subscription.objects.get(id=subscription_id, company=request.company)
        except Subscription.DoesNotExist:
            return None
    
    def post(self, request, subscription_id):
        """
        Update subscription status.
        
        Body parameters:
        - action: confirm, activate, pause, resume, cancel, close
        - reason: (optional) reason for cancellation
        """
        subscription = self.get_subscription(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        reason = request.data.get('reason', '')
        
        if not action:
            return Response(
                {'error': 'Action is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if action == 'confirm':
                if subscription.status != SubscriptionStatus.DRAFT:
                    raise ValueError('Only draft subscriptions can be confirmed')
                subscription.status = SubscriptionStatus.CONFIRMED
                subscription.confirmed_at = timezone.now()
            
            elif action == 'activate':
                if subscription.status not in [SubscriptionStatus.CONFIRMED, SubscriptionStatus.QUOTATION]:
                    raise ValueError('Only confirmed subscriptions can be activated')
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.activated_at = timezone.now()
            
            elif action == 'pause':
                if subscription.status != SubscriptionStatus.ACTIVE:
                    raise ValueError('Only active subscriptions can be paused')
                if not subscription.plan.is_pausable:
                    raise ValueError('This subscription plan does not allow pausing')
                subscription.status = SubscriptionStatus.PAUSED
            
            elif action == 'resume':
                if subscription.status != SubscriptionStatus.PAUSED:
                    raise ValueError('Only paused subscriptions can be resumed')
                subscription.status = SubscriptionStatus.ACTIVE
            
            elif action == 'cancel':
                if subscription.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED]:
                    raise ValueError('Only active or paused subscriptions can be cancelled')
                subscription.status = SubscriptionStatus.CANCELLED
                subscription.cancelled_at = timezone.now()
                subscription.cancellation_reason = reason
            
            elif action == 'close':
                if subscription.status not in [SubscriptionStatus.CANCELLED, SubscriptionStatus.ACTIVE]:
                    raise ValueError('Only cancelled or active subscriptions can be closed')
                if not subscription.plan.is_closable and subscription.status == SubscriptionStatus.ACTIVE:
                    raise ValueError('This subscription plan does not allow manual closing')
                subscription.status = SubscriptionStatus.CLOSED
                subscription.closed_at = timezone.now()
            
            else:
                return Response(
                    {'error': f'Invalid action: {action}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            subscription.save()
            
            serializer = SubscriptionDetailSerializer(subscription)
            return Response({
                'message': f'Subscription {action}ed successfully',
                'subscription': serializer.data
            })
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class SubscriptionPlanListView(APIView):
    """
    List all available subscription plans.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all active subscription plans."""
        plans = SubscriptionPlan.objects.filter(
            company=request.company,
            is_active=True
        ).order_by('name')
        
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response({
            'plans': serializer.data,
            'count': plans.count()
        })


class QuotationTemplateListView(APIView):
    """
    List all available quotation templates.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all active quotation templates."""
        templates = QuotationTemplate.objects.filter(
            company=request.company,
            is_active=True
        ).select_related('plan').order_by('name')
        
        serializer = QuotationTemplateSerializer(templates, many=True)
        return Response({
            'templates': serializer.data,
            'count': templates.count()
        })


class QuotationListCreateView(APIView):
    """
    List all quotations or create a new one.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all quotations with filtering."""
        # Check if user is a retailer viewing quotations sent to them
        from apps.party.models import RetailerUser
        retailer_mappings = RetailerUser.objects.filter(
            user=request.user,
            status='APPROVED'
        ).values_list('party_id', flat=True)
        
        if retailer_mappings.exists():
            # Retailer: show quotations where party is one of their linked parties
            quotations = Quotation.objects.filter(
                party_id__in=retailer_mappings
            ).select_related('party', 'plan', 'currency').order_by('-created_at')
        else:
            # Manufacturer: show quotations created by their company
            quotations = Quotation.objects.filter(
                company=request.company
            ).select_related('party', 'plan', 'currency').order_by('-created_at')
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            quotations = quotations.filter(status=status_filter)
        
        serializer = QuotationListSerializer(quotations, many=True)
        return Response({
            'quotations': serializer.data,
            'count': quotations.count()
        })
    
    def post(self, request):
        """Create a new quotation."""
        if not request.company:
            return Response(
                {'error': 'No active company found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract required fields
        party_id = request.data.get('party_id')
        plan_id = request.data.get('plan_id')
        valid_until = request.data.get('valid_until')
        start_date = request.data.get('start_date')
        items = request.data.get('items', [])
        
        if not all([party_id, plan_id, valid_until, start_date]):
            return Response(
                {'error': 'party_id, plan_id, valid_until, and start_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get related objects
        try:
            from apps.party.models import Party
            party = Party.objects.get(id=party_id, company=request.company)
            plan = SubscriptionPlan.objects.get(id=plan_id, company=request.company)
            currency = request.company.base_currency
        except (Party.DoesNotExist, SubscriptionPlan.DoesNotExist):
            return Response(
                {'error': 'Party or plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse dates
        if isinstance(valid_until, str):
            valid_until = date.fromisoformat(valid_until)
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        
        # Calculate total amount from items
        total_amount = sum(
            Decimal(str(item.get('quantity', 0))) * Decimal(str(item.get('unit_price', 0)))
            for item in items
        )
        
        # Create quotation
        quotation = Quotation.objects.create(
            company=request.company,
            party=party,
            plan=plan,
            status=QuotationStatus.DRAFT,
            valid_until=valid_until,
            start_date=start_date,
            total_amount=total_amount,
            currency=currency,
            terms_and_conditions=request.data.get('terms_and_conditions', ''),
            notes=request.data.get('notes', '')
        )
        
        # Create quotation items
        from apps.products.models import Product
        for item_data in items:
            try:
                product = Product.objects.get(
                    id=item_data.get('product_id'),
                    company=request.company
                )
                QuotationItem.objects.create(
                    quotation=quotation,
                    product=product,
                    quantity=item_data.get('quantity', 1),
                    unit_price=Decimal(str(item_data.get('unit_price', 0))),
                    discount_pct=Decimal(str(item_data.get('discount_pct', 0))),
                    tax_rate=Decimal(str(item_data.get('tax_rate', 0)))
                )
            except Product.DoesNotExist:
                pass  # Skip invalid products
        
        serializer = QuotationDetailSerializer(quotation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuotationDetailView(APIView):
    """
    Retrieve, update, or delete a quotation.
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, quotation_id):
        """Get quotation ensuring proper access (company for manufacturer, party for retailer)."""
        try:
            # Check if user is a retailer
            from apps.party.models import RetailerUser
            retailer_mappings = RetailerUser.objects.filter(
                user=request.user,
                status='APPROVED'
            ).values_list('party_id', flat=True)
            
            if retailer_mappings.exists():
                # Retailer: can access quotations where party is one of their linked parties
                return Quotation.objects.select_related(
                    'party', 'plan', 'currency', 'template'
                ).prefetch_related('items').get(
                    id=quotation_id,
                    party_id__in=retailer_mappings
                )
            else:
                # Manufacturer: can access quotations created by their company
                return Quotation.objects.select_related(
                    'party', 'plan', 'currency', 'template'
                ).prefetch_related('items').get(
                    id=quotation_id,
                    company=request.company
                )
        except Quotation.DoesNotExist:
            return None
    
    def get(self, request, quotation_id):
        """Get quotation details."""
        quotation = self.get_object(request, quotation_id)
        if not quotation:
            return Response(
                {'error': 'Quotation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = QuotationDetailSerializer(quotation)
        return Response(serializer.data)


class QuotationAcceptView(APIView):
    """
    Accept a quotation and convert it to a subscription.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, quotation_id):
        """Accept a quotation."""
        try:
            # Check if user is a retailer
            from apps.party.models import RetailerUser
            retailer_mappings = RetailerUser.objects.filter(
                user=request.user,
                status='APPROVED'
            ).values_list('party_id', flat=True)
            
            if retailer_mappings.exists():
                # Retailer: can accept quotations where party is one of their linked parties
                quotation = Quotation.objects.select_related(
                    'party', 'plan', 'currency'
                ).get(id=quotation_id, party_id__in=retailer_mappings)
            else:
                # Manufacturer: can access their company's quotations
                quotation = Quotation.objects.select_related(
                    'party', 'plan', 'currency'
                ).get(id=quotation_id, company=request.company)
        except Quotation.DoesNotExist:
            return Response(
                {'error': 'Quotation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate quotation status
        if quotation.status != QuotationStatus.SENT:
            return Response(
                {'error': 'Only sent quotations can be accepted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if expired
        if quotation.valid_until < date.today():
            quotation.status = QuotationStatus.EXPIRED
            quotation.save()
            return Response(
                {'error': 'This quotation has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already has a subscription
        if quotation.subscription:
            return Response(
                {'error': 'This quotation has already been accepted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create subscription from quotation
        try:
            # Calculate monthly value from quotation items first
            quotation_items = QuotationItem.objects.filter(quotation=quotation)
            monthly_value = sum(
                Decimal(str(item.quantity)) * Decimal(str(item.unit_price))
                for item in quotation_items
            ) or quotation.plan.base_price or Decimal('0.00')
            
            # Create subscription with monthly value pre-calculated
            subscription = Subscription.objects.create(
                company=quotation.company,
                party=quotation.party,
                plan=quotation.plan,
                status=SubscriptionStatus.CONFIRMED,
                start_date=quotation.start_date,
                next_billing_date=quotation.start_date,
                currency=quotation.currency,
                confirmed_at=timezone.now(),
                quotation_template=quotation.template,
                monthly_value=monthly_value
            )
            
            # Copy quotation items to subscription
            for item in quotation_items:
                SubscriptionItem.objects.create(
                    subscription=subscription,
                    product=item.product,
                    product_variant=item.product_variant,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    discount_pct=item.discount_pct,
                    tax_rate=item.tax_rate,
                    description=''
                )
            
            # Update quotation using update() to avoid save() method
            Quotation.objects.filter(id=quotation.id).update(
                status=QuotationStatus.ACCEPTED,
                accepted_at=timezone.now(),
                subscription=subscription
            )
            
            return Response({
                'message': 'Quotation accepted successfully',
                'subscription_id': str(subscription.id),
                'subscription_number': subscription.subscription_number
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # If anything fails, log the error and return a proper error response
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'Failed to accept quotation: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuotationRejectView(APIView):
    """
    Reject a quotation.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, quotation_id):
        """Reject a quotation."""
        try:
            # Check if user is a retailer
            from apps.party.models import RetailerUser
            retailer_mappings = RetailerUser.objects.filter(
                user=request.user,
                status='APPROVED'
            ).values_list('party_id', flat=True)
            
            if retailer_mappings.exists():
                # Retailer: can reject quotations where party is one of their linked parties
                quotation = Quotation.objects.get(
                    id=quotation_id,
                    party_id__in=retailer_mappings
                )
            else:
                # Manufacturer: can access their company's quotations
                quotation = Quotation.objects.get(
                    id=quotation_id,
                    company=request.company
                )
        except Quotation.DoesNotExist:
            return Response(
                {'error': 'Quotation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate quotation status
        if quotation.status != QuotationStatus.SENT:
            return Response(
                {'error': 'Only sent quotations can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update quotation
        quotation.status = QuotationStatus.REJECTED
        quotation.rejected_at = timezone.now()
        quotation.rejection_reason = request.data.get('reason', '')
        quotation.save()
        
        return Response({
            'message': 'Quotation rejected'
        }, status=status.HTTP_200_OK)


class QuotationSendView(APIView):
    """
    Send a quotation to the customer (change status to SENT).
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, quotation_id):
        """Send a quotation."""
        try:
            quotation = Quotation.objects.get(
                id=quotation_id,
                company=request.company
            )
        except Quotation.DoesNotExist:
            return Response(
                {'error': 'Quotation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate quotation status
        if quotation.status != QuotationStatus.DRAFT:
            return Response(
                {'error': 'Only draft quotations can be sent'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate quotation has items
        if not quotation.items.exists():
            return Response(
                {'error': 'Cannot send quotation without items'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update quotation
        quotation.status = QuotationStatus.SENT
        quotation.sent_at = timezone.now()
        quotation.save()
        
        return Response({
            'message': 'Quotation sent successfully',
            'quotation_number': quotation.quotation_number
        }, status=status.HTTP_200_OK)


class SubscriptionCreateOrderView(APIView):
    """
    Create a sales order from a confirmed subscription.
    
    This handles the workflow: Subscription (confirmed) → Order (draft)
    As shown in the UI workflow diagram.
    """
    permission_classes = [IsAuthenticated]
    
    def get_subscription(self, request, subscription_id):
        """Get subscription ensuring company scope."""
        try:
            return Subscription.objects.select_related(
                'party', 'plan', 'currency'
            ).prefetch_related(
                'items__product', 'items__product_variant'
            ).get(id=subscription_id, company=request.company)
        except Subscription.DoesNotExist:
            return None
    
    def post(self, request, subscription_id):
        """
        Create a sales order from subscription.
        
        Body parameters:
        - order_date: (optional) Order date (defaults to today)
        - delivery_date: (optional) Expected delivery date
        - customer_po_number: (optional) Customer PO reference
        - notes: (optional) Order notes
        """
        subscription = self.get_subscription(request, subscription_id)
        if not subscription:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate subscription is in correct state
        if subscription.status not in [SubscriptionStatus.CONFIRMED, SubscriptionStatus.ACTIVE]:
            return Response(
                {'error': 'Can only create orders from confirmed or active subscriptions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if subscription has items
        if not subscription.items.exists():
            return Response(
                {'error': 'Subscription has no items to order'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create sales order
            order_date = request.data.get('order_date', date.today())
            if isinstance(order_date, str):
                order_date = date.fromisoformat(order_date)
            
            delivery_date = request.data.get('delivery_date')
            if delivery_date and isinstance(delivery_date, str):
                delivery_date = date.fromisoformat(delivery_date)
            
            sales_order = SalesOrder.objects.create(
                company=request.company,
                order_number='',  # Will be auto-generated
                customer=subscription.party,
                status=OrderStatus.DRAFT,
                order_date=order_date,
                delivery_date=delivery_date,
                currency=subscription.currency,
                customer_po_number=request.data.get('customer_po_number', ''),
                notes=request.data.get('notes', f'Created from subscription {subscription.subscription_number}'),
                created_by=request.user
            )
            
            # Copy subscription items to order items
            from apps.orders.models import OrderItem
            for sub_item in subscription.items.all():
                OrderItem.objects.create(
                    order=sales_order,
                    product=sub_item.product,
                    quantity=sub_item.quantity,
                    unit_price=sub_item.unit_price,
                    discount_percentage=sub_item.discount_pct,
                    tax_rate=sub_item.tax_rate,
                    description=sub_item.description or sub_item.product.description
                )
            
            return Response({
                'message': 'Sales order created successfully',
                'order_id': str(sales_order.id),
                'order_number': sales_order.order_number,
                'status': sales_order.status
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Failed to create order: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubscriptionOrderListView(APIView):
    """
    List all orders created from a subscription.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, subscription_id):
        """Get all orders linked to this subscription."""
        try:
            subscription = Subscription.objects.get(
                id=subscription_id,
                company=request.company
            )
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get orders that reference this subscription (via notes or custom field)
        # For now, we'll return orders for the same customer
        orders = SalesOrder.objects.filter(
            company=request.company,
            customer=subscription.party
        ).values(
            'id', 'order_number', 'order_date', 'status', 
            'delivery_date', 'confirmed_at', 'invoiced_at'
        ).order_by('-order_date')
        
        return Response({
            'orders': list(orders),
            'count': orders.count()
        })


class OrderCreateInvoiceView(APIView):
    """
    Create an invoice from a confirmed order.
    
    This handles the workflow: Order (confirmed) → Invoice (draft)
    As shown in the UI workflow diagram.
    """
    permission_classes = [IsAuthenticated]
    
    def get_order(self, request, order_id):
        """Get order ensuring company scope."""
        try:
            from apps.orders.models import SalesOrder
            return SalesOrder.objects.select_related(
                'customer', 'currency'
            ).prefetch_related(
                'items__product'
            ).get(id=order_id, company=request.company)
        except SalesOrder.DoesNotExist:
            return None
    
    def post(self, request, order_id):
        """
        Create an invoice from order.
        
        Body parameters:
        - invoice_date: (optional) Invoice date (defaults to today)
        - due_date: (optional) Payment due date (defaults to invoice_date + 30 days)
        - payment_terms: (optional) Payment terms description
        """
        order = self.get_order(request, order_id)
        if not order:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate order is confirmed
        if order.status not in [OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS]:
            return Response(
                {'error': 'Can only create invoices from confirmed orders'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if order already has an invoice
        if order.invoices.exists():
            existing_invoice = order.invoices.first()
            return Response(
                {
                    'error': 'Order already has an invoice',
                    'invoice_id': str(existing_invoice.id),
                    'invoice_number': existing_invoice.invoice_number
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create invoice
            invoice_date = request.data.get('invoice_date', date.today())
            if isinstance(invoice_date, str):
                invoice_date = date.fromisoformat(invoice_date)
            
            due_date = request.data.get('due_date')
            if due_date:
                if isinstance(due_date, str):
                    due_date = date.fromisoformat(due_date)
            else:
                due_date = invoice_date + timedelta(days=30)
            
            invoice = Invoice.objects.create(
                company=request.company,
                invoice_number='',  # Will be auto-generated
                invoice_date=invoice_date,
                party=order.customer,
                invoice_type=InvoiceType.SALES,
                due_date=due_date,
                currency=order.currency,
                status=InvoiceStatus.DRAFT,
                sales_order=order,
                created_by=request.user
            )
            
            # Copy order items to invoice lines
            from apps.invoice.models import InvoiceLine
            for order_item in order.items.all():
                InvoiceLine.objects.create(
                    invoice=invoice,
                    product=order_item.product,
                    description=order_item.description or order_item.product.description,
                    quantity=order_item.quantity,
                    unit_price=order_item.unit_price,
                    discount_percentage=order_item.discount_percentage,
                    hsn_code=getattr(order_item.product, 'hsn_code', ''),
                    igst_rate=order_item.tax_rate if order_item.tax_rate > 0 else 0,
                    created_by=request.user
                )
            
            # Update order status
            order.status = OrderStatus.INVOICE_CREATED_PENDING_POSTING
            order.invoiced_at = timezone.now()
            order.save()
            
            return Response({
                'message': 'Invoice created successfully',
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'status': invoice.status
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Failed to create invoice: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InvoiceConfirmView(APIView):
    """
    Confirm an invoice (change status from DRAFT to POSTED).
    
    This handles the final step: Invoice (draft) → Invoice (confirmed/posted)
    As shown in the UI workflow diagram.
    """
    permission_classes = [IsAuthenticated]
    
    def get_invoice(self, request, invoice_id):
        """Get invoice ensuring company scope."""
        try:
            return Invoice.objects.get(id=invoice_id, company=request.company)
        except Invoice.DoesNotExist:
            return None
    
    def post(self, request, invoice_id):
        """
        Confirm/post an invoice.
        
        Body parameters:
        - payment_method: (optional) Payment method (e.g., "Cash", "Credit Card")
        - amount: (optional) Payment amount if paying immediately
        - payment_date: (optional) Payment date if paying immediately
        """
        invoice = self.get_invoice(request, invoice_id)
        if not invoice:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate invoice is in draft
        if invoice.status != InvoiceStatus.DRAFT:
            return Response(
                {'error': f'Can only confirm draft invoices. Current status: {invoice.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update invoice status to posted
            invoice.status = InvoiceStatus.POSTED
            invoice.posted_at = timezone.now()
            invoice.save()
            
            # If payment information is provided, create payment record
            payment_method = request.data.get('payment_method')
            amount = request.data.get('amount')
            
            if payment_method and amount:
                # Create payment voucher
                payment_date = request.data.get('payment_date', date.today())
                if isinstance(payment_date, str):
                    payment_date = date.fromisoformat(payment_date)
                
                # Update invoice status to paid if full amount
                from decimal import Decimal
                from apps.invoice.models import InvoiceLine
                total_amount = sum(
                    line.quantity * line.unit_price 
                    for line in invoice.lines.all()
                )
                
                if Decimal(str(amount)) >= total_amount:
                    invoice.status = InvoiceStatus.PAID
                    invoice.save()
            
            return Response({
                'message': 'Invoice confirmed successfully',
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'status': invoice.status
            })
        
        except Exception as e:
            return Response(
                {'error': f'Failed to confirm invoice: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubscriptionInvoiceListView(APIView):
    """
    List all invoices created from orders related to a subscription.    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, subscription_id):
        """Get all invoices linked to this subscription."""
        try:
            subscription = Subscription.objects.get(
                id=subscription_id,
                company=request.company
            )
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get invoices for the same customer
        invoices = Invoice.objects.filter(
            company=request.company,
            party=subscription.party,
            invoice_type=InvoiceType.SALES
        ).values(
            'id', 'invoice_number', 'invoice_date', 'due_date',
            'status', 'posted_at', 'sales_order__order_number'
        ).order_by('-invoice_date')
        
        return Response({
            'invoices': list(invoices),
            'count': invoices.count()
        })


class SubscriptionGenerateInvoiceView(APIView):
    """
    Generate invoice from a subscription.
    
    POST /subscriptions/{id}/generate-invoice/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, subscription_id):
        """Generate invoice from subscription."""
        try:
            subscription = Subscription.objects.get(
                id=subscription_id,
                company=request.company
            )
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Import the service
        from apps.subscriptions.services.invoice_service import SubscriptionInvoiceService
        
        # Get optional parameters
        auto_post = request.data.get('auto_post', False)
        
        # Generate and send invoice
        result = SubscriptionInvoiceService.send_invoice_to_retailer(
            subscription, 
            auto_post=auto_post
        )
        
        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_400_BAD_REQUEST
            )


class SubscriptionBulkBillingView(APIView):
    """
    Process bulk billing for all due subscriptions.
    
    POST /subscriptions/bulk-billing/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Process bulk billing for company subscriptions."""
        # Import the service
        from apps.subscriptions.services.invoice_service import SubscriptionInvoiceService
        
        # Process billing for all subscriptions in this company
        results = SubscriptionInvoiceService.process_billing_for_all_subscriptions(
            company=request.company
        )
        
        return Response({
            'message': 'Bulk billing processing completed',
            'results': results
        }, status=status.HTTP_200_OK)
