from rest_framework import serializers
from .models import Category, InventoryItem, InventoryTransaction
from core.serializers import LocationSerializer


class CategorySerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active', 'items_count', 'created_at', 'updated_at']


class InventoryItemSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'item_name', 'category', 'category_name', 'description',
            'unit', 'location', 'location_details', 'current_quantity',
            'minimum_stock', 'maximum_stock', 'supplier', 'cost',
            'status', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class InventoryTransactionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)
    from_location_name = serializers.CharField(source='from_location.name', read_only=True)
    to_location_name = serializers.CharField(source='to_location.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            'id', 'item', 'item_name', 'item_unit', 'transaction_type',
            'quantity', 'from_location', 'from_location_name',
            'to_location', 'to_location_name', 'user', 'user_name',
            'reason', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'user']
