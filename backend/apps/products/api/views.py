"""
API views for Products app.
Provides CRUD operations for Product and Category catalog management.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count

from apps.products.models import Product, Category
from apps.products.api.serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer
)


class CategoryListCreateView(APIView):
    """
    List all categories or create a new one.
    
    GET: Returns all categories for the company
    POST: Creates a new category
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all categories with product counts."""
        categories = Category.objects.filter(
            company=request.company
        ).annotate(
            product_count=Count('products')
        ).order_by('display_order', 'name')
        
        serializer = CategorySerializer(categories, many=True)
        return Response({
            'categories': serializer.data,
            'count': categories.count()
        })
    
    def post(self, request):
        """Create a new category."""
        # Verify user has an active company
        if not request.company:
            return Response(
                {'error': 'No active company found. Please ensure you have a company assigned.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(company=request.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CategoryDetailView(APIView):
    """
    Retrieve, update, or delete a category.
    
    GET: Returns category details
    PUT: Updates category
    PATCH: Partially updates category
    DELETE: Deletes category (if no products attached)
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, category_id):
        """Get category ensuring company scope."""
        try:
            return Category.objects.annotate(
                product_count=Count('products')
            ).get(id=category_id, company=request.company)
        except Category.DoesNotExist:
            return None
    
    def get(self, request, category_id):
        """Get category details."""
        category = self.get_object(request, category_id)
        if not category:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = CategorySerializer(category)
        return Response(serializer.data)
    
    def put(self, request, category_id):
        """Update category."""
        category = self.get_object(request, category_id)
        if not category:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = CategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, category_id):
        """Partially update category."""
        category = self.get_object(request, category_id)
        if not category:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = CategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, category_id):
        """Delete category if no products attached."""
        category = self.get_object(request, category_id)
        if not category:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if category.products.exists():
            return Response(
                {'error': 'Cannot delete category with products. Move or delete products first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductListCreateView(APIView):
    """
    List all products or create a new one.
    
    GET: Returns products with filtering/search
    POST: Creates a new product
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        List products with filtering.
        
        Query params:
            q: Search in name, brand, description
            category_id: Filter by category UUID
            brand: Filter by brand
            status: Filter by status
            is_portal_visible: Filter by portal visibility
            is_featured: Filter featured products
            limit: Max results (default: 100, max: 500)
        """
        qs = Product.objects.filter(company=request.company).select_related('category')
        
        # Search
        search = request.query_params.get('q', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(brand__icontains=search) |
                Q(description__icontains=search)
            )
        
        # Filters
        category_id = request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)
        
        brand = request.query_params.get('brand')
        if brand:
            qs = qs.filter(brand__icontains=brand)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        is_portal_visible = request.query_params.get('is_portal_visible')
        if is_portal_visible is not None:
            qs = qs.filter(is_portal_visible=is_portal_visible.lower() == 'true')
        
        is_featured = request.query_params.get('is_featured')
        if is_featured is not None:
            qs = qs.filter(is_featured=is_featured.lower() == 'true')
        
        # Additional filters
        product_type = request.query_params.get('product_type')
        if product_type:
            qs = qs.filter(product_type=product_type)
        
        assigned_user = request.query_params.get('assigned_user')
        if assigned_user:
            qs = qs.filter(assigned_user_id=assigned_user)
        
        # Order by name
        qs = qs.order_by('name')
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', request.query_params.get('limit', 100)))
        page_size = min(page_size, 500)  # Max 500 items per page
        
        # Get total count before slicing
        total_count = qs.count()
        
        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        products_page = qs[start:end]
        
        # Sync stock quantities from inventory system
        for product in products_page:
            try:
                product.update_stock_from_items()
            except Exception:
                # Continue even if sync fails for some products
                pass
        
        serializer = ProductListSerializer(products_page, many=True)
        return Response({
            'products': serializer.data,
            'results': serializer.data,  # Alternative key for compatibility
            'count': total_count,
            'total': total_count,  # Alternative key for compatibility
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
    
    def post(self, request):
        """Create a new product."""
        # Verify user has an active company
        if not request.company:
            return Response(
                {'error': 'No active company found. Please ensure you have a company assigned.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProductCreateUpdateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            product = serializer.save()
            # Sync stock from inventory system
            try:
                product.update_stock_from_items()
            except Exception:
                pass
            # Return detailed view
            detail_serializer = ProductDetailSerializer(product)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDetailView(APIView):
    """
    Retrieve, update, or delete a product.
    
    GET: Returns product details with linked stock items
    PUT: Updates product
    PATCH: Partially updates product
    DELETE: Deletes product (soft delete recommended)
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, product_id):
        """Get product ensuring company scope."""
        try:
            return Product.objects.select_related(
                'category', 'created_by', 'assigned_user'
            ).prefetch_related(
                'recurring_prices', 'product_variants'
            ).get(
                id=product_id,
                company=request.company
            )
        except Product.DoesNotExist:
            return None
    
    def get(self, request, product_id):
        """Get product details."""
        product = self.get_object(request, product_id)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Sync stock quantity from inventory system
        try:
            product.update_stock_from_items()
        except Exception:
            pass  # Continue even if sync fails
        
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)
    
    def put(self, request, product_id):
        """Update product."""
        product = self.get_object(request, product_id)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductCreateUpdateSerializer(
            product,
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            # Sync stock before returning
            try:
                product.update_stock_from_items()
            except Exception:
                pass
            # Return detailed view
            detail_serializer = ProductDetailSerializer(product)
            return Response(detail_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, product_id):
        """Partially update product."""
        product = self.get_object(request, product_id)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductCreateUpdateSerializer(
            product,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            # Sync stock before returning
            try:
                product.update_stock_from_items()
            except Exception:
                pass
            # Return detailed view
            detail_serializer = ProductDetailSerializer(product)
            return Response(detail_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, product_id):
        """Delete product."""
        product = self.get_object(request, product_id)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if product has linked stock items
        if product.stockitems.exists():
            return Response(
                {
                    'error': 'Cannot delete product with linked stock items.',
                    'suggestion': 'Set is_portal_visible=False to hide instead.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductSyncStockView(APIView):
    """
    Sync product availability from linked stock items.
    
    POST: Triggers update_stock_from_items() for a product
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, product_id):
        """Sync stock availability."""
        try:
            product = Product.objects.get(id=product_id, company=request.company)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update from stock items
        product.update_stock_from_items()
        
        serializer = ProductDetailSerializer(product)
        return Response({
            'message': 'Stock synced successfully',
            'product': serializer.data
        })
