"""
API views for Pricing app configuration.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.pricing.models import Tax
from apps.pricing.api.serializers import TaxSerializer


class TaxListCreateView(APIView):
    """
    List all taxes or create a new one.
    
    GET: Returns all taxes for the company
    POST: Creates a new tax
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all taxes for the company."""
        company = request.company
        taxes = Tax.objects.filter(company=company).order_by('name')
        serializer = TaxSerializer(taxes, many=True, context={'request': request})
        return Response({'taxes': serializer.data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new tax."""
        serializer = TaxSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaxDetailView(APIView):
    """
    Retrieve, update or delete a tax.
    
    GET: Returns tax details
    PUT: Updates a tax
    DELETE: Deletes a tax
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, tax_id, company):
        """Get tax by ID and company."""
        try:
            return Tax.objects.get(id=tax_id, company=company)
        except Tax.DoesNotExist:
            return None
    
    def get(self, request, tax_id):
        """Retrieve tax details."""
        tax = self.get_object(tax_id, request.company)
        if not tax:
            return Response(
                {'error': 'Tax not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = TaxSerializer(tax, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, tax_id):
        """Update a tax."""
        tax = self.get_object(tax_id, request.company)
        if not tax:
            return Response(
                {'error': 'Tax not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TaxSerializer(tax, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, tax_id):
        """Delete a tax."""
        tax = self.get_object(tax_id, request.company)
        if not tax:
            return Response(
                {'error': 'Tax not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        tax.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
