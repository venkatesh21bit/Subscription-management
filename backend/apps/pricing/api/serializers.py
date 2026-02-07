"""
Serializers for Pricing app.
"""
from rest_framework import serializers
from apps.pricing.models import Tax


class TaxSerializer(serializers.ModelSerializer):
    """Serializer for Tax model."""
    id = serializers.UUIDField(read_only=True)
    computation_display = serializers.CharField(source='get_computation_display', read_only=True)
    
    class Meta:
        model = Tax
        fields = [
            'id',
            'name',
            'computation',
            'computation_display',
            'amount',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create tax with company from request context."""
        validated_data['company'] = self.context['request'].company
        return super().create(validated_data)
