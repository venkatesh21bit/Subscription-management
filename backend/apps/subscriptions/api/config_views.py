"""
API views for Subscriptions app configuration.
Handles discounts, attributes, recurring plans, and quotation templates.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.subscriptions.models import (
    DiscountRule,
    ProductAttribute,
    SubscriptionPlan,
    QuotationTemplate
)
from apps.subscriptions.api.serializers import (
    DiscountRuleSerializer,
    ProductAttributeSerializer,
    RecurringPlanSerializer,
    QuotationTemplateDetailSerializer
)


# ============================================================================
# DISCOUNT VIEWS
# ============================================================================

class DiscountListCreateView(APIView):
    """
    List all discounts or create a new one.
    
    GET: Returns all discounts for the company
    POST: Creates a new discount
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all discounts for the company."""
        company = request.company
        discounts = DiscountRule.objects.filter(company=company).order_by('-created_at')
        serializer = DiscountRuleSerializer(discounts, many=True, context={'request': request})
        return Response({'discounts': serializer.data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new discount."""
        serializer = DiscountRuleSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DiscountDetailView(APIView):
    """
    Retrieve, update or delete a discount.
    
    GET: Returns discount details
    PUT: Updates a discount
    DELETE: Deletes a discount
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, discount_id, company):
        """Get discount by ID and company."""
        try:
            return DiscountRule.objects.get(id=discount_id, company=company)
        except DiscountRule.DoesNotExist:
            return None
    
    def get(self, request, discount_id):
        """Retrieve discount details."""
        discount = self.get_object(discount_id, request.company)
        if not discount:
            return Response(
                {'error': 'Discount not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = DiscountRuleSerializer(discount, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, discount_id):
        """Update a discount."""
        discount = self.get_object(discount_id, request.company)
        if not discount:
            return Response(
                {'error': 'Discount not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = DiscountRuleSerializer(discount, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, discount_id):
        """Delete a discount."""
        discount = self.get_object(discount_id, request.company)
        if not discount:
            return Response(
                {'error': 'Discount not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        discount.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# ATTRIBUTE VIEWS
# ============================================================================

class AttributeListCreateView(APIView):
    """
    List all attributes or create a new one.
    
    GET: Returns all attributes for the company
    POST: Creates a new attribute
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all attributes for the company."""
        company = request.company
        attributes = ProductAttribute.objects.filter(company=company).order_by('name')
        serializer = ProductAttributeSerializer(attributes, many=True, context={'request': request})
        return Response({'attributes': serializer.data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new attribute."""
        serializer = ProductAttributeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AttributeDetailView(APIView):
    """
    Retrieve, update or delete an attribute.
    
    GET: Returns attribute details
    PUT: Updates an attribute
    DELETE: Deletes an attribute
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, attribute_id, company):
        """Get attribute by ID and company."""
        try:
            return ProductAttribute.objects.get(id=attribute_id, company=company)
        except ProductAttribute.DoesNotExist:
            return None
    
    def get(self, request, attribute_id):
        """Retrieve attribute details."""
        attribute = self.get_object(attribute_id, request.company)
        if not attribute:
            return Response(
                {'error': 'Attribute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ProductAttributeSerializer(attribute, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, attribute_id):
        """Update an attribute."""
        attribute = self.get_object(attribute_id, request.company)
        if not attribute:
            return Response(
                {'error': 'Attribute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductAttributeSerializer(attribute, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, attribute_id):
        """Delete an attribute."""
        attribute = self.get_object(attribute_id, request.company)
        if not attribute:
            return Response(
                {'error': 'Attribute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        attribute.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# RECURRING PLAN VIEWS
# ============================================================================

class RecurringPlanListCreateView(APIView):
    """
    List all recurring plans or create a new one.
    
    GET: Returns all recurring plans for the company
    POST: Creates a new recurring plan
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all recurring plans for the company."""
        company = request.company
        plans = SubscriptionPlan.objects.filter(company=company).order_by('name')
        serializer = RecurringPlanSerializer(plans, many=True, context={'request': request})
        return Response({'plans': serializer.data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new recurring plan."""
        serializer = RecurringPlanSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecurringPlanDetailView(APIView):
    """
    Retrieve, update or delete a recurring plan.
    
    GET: Returns plan details
    PUT: Updates a plan
    DELETE: Deletes a plan
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, plan_id, company):
        """Get plan by ID and company."""
        try:
            return SubscriptionPlan.objects.get(id=plan_id, company=company)
        except SubscriptionPlan.DoesNotExist:
            return None
    
    def get(self, request, plan_id):
        """Retrieve plan details."""
        plan = self.get_object(plan_id, request.company)
        if not plan:
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = RecurringPlanSerializer(plan, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, plan_id):
        """Update a plan."""
        plan = self.get_object(plan_id, request.company)
        if not plan:
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = RecurringPlanSerializer(plan, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, plan_id):
        """Delete a plan."""
        plan = self.get_object(plan_id, request.company)
        if not plan:
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# QUOTATION TEMPLATE VIEWS
# ============================================================================

class QuotationTemplateListCreateView(APIView):
    """
    List all quotation templates or create a new one.
    
    GET: Returns all templates for the company
    POST: Creates a new template
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all quotation templates for the company."""
        company = request.company
        templates = QuotationTemplate.objects.filter(company=company).order_by('name')
        serializer = QuotationTemplateDetailSerializer(templates, many=True, context={'request': request})
        return Response({'templates': serializer.data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new quotation template."""
        serializer = QuotationTemplateDetailSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuotationTemplateDetailView(APIView):
    """
    Retrieve, update or delete a quotation template.
    
    GET: Returns template details
    PUT: Updates a template
    DELETE: Deletes a template
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, template_id, company):
        """Get template by ID and company."""
        try:
            return QuotationTemplate.objects.get(id=template_id, company=company)
        except QuotationTemplate.DoesNotExist:
            return None
    
    def get(self, request, template_id):
        """Retrieve template details."""
        template = self.get_object(template_id, request.company)
        if not template:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = QuotationTemplateDetailSerializer(template, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, template_id):
        """Update a template."""
        template = self.get_object(template_id, request.company)
        if not template:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = QuotationTemplateDetailSerializer(template, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, template_id):
        """Delete a template."""
        template = self.get_object(template_id, request.company)
        if not template:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
