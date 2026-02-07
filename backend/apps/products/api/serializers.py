"""
Serializers for Products app.
Handles Product and Category catalog management for B2B portal.
"""
from rest_framework import serializers
from apps.products.models import Product, Category, ProductRecurringPrice, ProductVariant
from django.contrib.auth import get_user_model

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Product Category.
    UUID-based primary key for multi-tenant safety.
    """
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    product_count = serializers.IntegerField(read_only=True, required=False)
    
    class Meta:
        model = Category
        fields = [
            'id',
            'company_id',
            'name',
            'description',
            'is_active',
            'display_order',
            'product_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']


class ProductRecurringPriceSerializer(serializers.ModelSerializer):
    """
    Serializer for Product Recurring Prices.
    """
    id = serializers.UUIDField(read_only=True)
    
    class Meta:
        model = ProductRecurringPrice
        fields = [
            'id',
            'recurring_plan',
            'price',
            'min_qty',
            'start_date',
            'end_date'
        ]
        read_only_fields = ['id']


class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Serializer for Product Variants.
    """
    id = serializers.UUIDField(read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'attribute',
            'values',
            'extra_price'
        ]
        read_only_fields = ['id']


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for product listing.
    Optimized for catalog browsing.
    """
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    assigned_user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id',
            'company_id',
            'name',
            'product_type',
            'category_id',
            'category_name',
            'brand',
            'available_quantity',
            'unit',
            'price',
            'cost',
            'tax_rate',
            'cgst_rate',
            'sgst_rate',
            'igst_rate',
            'assigned_user',
            'assigned_user_name',
            'status',
            'is_portal_visible',
            'is_featured',
            'created_at'
        ]
        read_only_fields = ['id', 'company_id', 'category_name', 'assigned_user_name', 'created_at']
    
    def get_assigned_user_name(self, obj):
        """Get assigned user's username or email."""
        if obj.assigned_user:
            return obj.assigned_user.username or obj.assigned_user.email
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for product CRUD operations.
    Includes all fields, tax information, and nested recurring prices/variants.
    """
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_id = serializers.UUIDField(required=False, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    assigned_user_name = serializers.SerializerMethodField()
    
    # Nested serializers
    recurring_prices = ProductRecurringPriceSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True, source='product_variants')
    
    # Stock item count (reverse relation)
    stock_item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id',
            'company_id',
            'name',
            'product_type',
            'category_id',
            'category_name',
            'description',
            'brand',
            'available_quantity',
            'unit',
            'total_shipped',
            'total_required_quantity',
            'price',
            'cost',
            'tax_rate',
            'assigned_user',
            'assigned_user_name',
            'hsn_code',
            'cgst_rate',
            'sgst_rate',
            'igst_rate',
            'cess_rate',
            'is_portal_visible',
            'is_featured',
            'status',
            'recurring_prices',
            'variants',
            'created_by_id',
            'created_by_name',
            'stock_item_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'company_id',
            'category_name',
            'assigned_user_name',
            'created_by_name',
            'recurring_prices',
            'variants',
            'stock_item_count',
            'created_at',
            'updated_at'
        ]
    
    def get_assigned_user_name(self, obj):
        """Get assigned user's username or email."""
        if obj.assigned_user:
            return obj.assigned_user.username or obj.assigned_user.email
        return None
    
    def get_stock_item_count(self, obj):
        """Count linked stock items."""
        return obj.stockitems.count()
    
    def validate_category_id(self, value):
        """Ensure category belongs to the same company."""
        if value:
            request = self.context.get('request')
            if request and request.company:
                try:
                    category = Category.objects.get(id=value, company=request.company)
                except Category.DoesNotExist:
                    raise serializers.ValidationError(
                        "Category not found or doesn't belong to your company."
                    )
        return value


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating products with nested recurring prices and variants.
    """
    id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    recurring_prices = ProductRecurringPriceSerializer(many=True, required=False)
    variants = ProductVariantSerializer(many=True, required=False)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'product_type',
            'category_id',
            'description',
            'brand',
            'unit',
            'price',
            'cost',
            'tax_rate',
            'assigned_user',
            'available_quantity',
            'total_shipped',
            'total_required_quantity',
            'hsn_code',
            'cgst_rate',
            'sgst_rate',
            'igst_rate',
            'cess_rate',
            'is_portal_visible',
            'is_featured',
            'status',
            'recurring_prices',
            'variants'
        ]
        read_only_fields = ['id']
    
    def validate_category_id(self, value):
        """Ensure category belongs to the same company."""
        if value:
            request = self.context.get('request')
            if request and hasattr(request, 'company'):
                try:
                    Category.objects.get(id=value, company=request.company)
                except Category.DoesNotExist:
                    raise serializers.ValidationError(
                        "Category not found or doesn't belong to your company."
                    )
        return value
    
    def validate_assigned_user(self, value):
        """Ensure assigned user exists."""
        if value:
            try:
                User.objects.get(id=value)
            except User.DoesNotExist:
                raise serializers.ValidationError("User not found.")
        return value
    
    def create(self, validated_data):
        """Create product with company context and nested objects."""
        request = self.context.get('request')
        if not request or not request.company:
            raise serializers.ValidationError(
                "No active company found. Please ensure you have a company assigned."
            )
        
        # Extract nested data
        recurring_prices_data = validated_data.pop('recurring_prices', [])
        variants_data = validated_data.pop('variants', [])
        
        validated_data['company'] = request.company
        validated_data['created_by'] = request.user
        
        # Handle category_id -> category conversion
        category_id = validated_data.pop('category_id', None)
        if category_id:
            validated_data['category'] = Category.objects.get(id=category_id)
        
        # Create the product
        product = super().create(validated_data)
        
        # Create recurring prices
        for price_data in recurring_prices_data:
            ProductRecurringPrice.objects.create(
                product=product,
                company=request.company,
                **price_data
            )
        
        # Create variants
        for variant_data in variants_data:
            ProductVariant.objects.create(
                product=product,
                company=request.company,
                **variant_data
            )
        
        return product
    
    def update(self, instance, validated_data):
        """Update product and nested objects."""
        request = self.context.get('request')
        
        # Extract nested data
        recurring_prices_data = validated_data.pop('recurring_prices', None)
        variants_data = validated_data.pop('variants', None)
        
        # Handle category FK
        category_id = validated_data.pop('category_id', None)
        if category_id:
            validated_data['category'] = Category.objects.get(id=category_id)
        elif 'category_id' in self.initial_data and not category_id:
            validated_data['category'] = None
        
        # Update the product
        product = super().update(instance, validated_data)
        
        # Update recurring prices if provided
        if recurring_prices_data is not None:
            # Delete existing recurring prices
            instance.recurring_prices.all().delete()
            # Create new ones
            for price_data in recurring_prices_data:
                ProductRecurringPrice.objects.create(
                    product=instance,
                    company=request.company,
                    **price_data
                )
        
        # Update variants if provided
        if variants_data is not None:
            # Delete existing variants
            instance.product_variants.all().delete()
            # Create new ones
            for variant_data in variants_data:
                ProductVariant.objects.create(
                    product=instance,
                    company=request.company,
                    **variant_data
                )
        
        return product
