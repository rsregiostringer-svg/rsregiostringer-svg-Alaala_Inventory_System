from rest_framework import serializers
from .models import Casket, CasketTransaction
from core.serializers import LocationSerializer


class CasketTransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CasketTransaction
        fields = [
            'id', 'casket', 'action', 'user', 'user_name',
            'previous_status', 'new_status', 'deceased_name',
            'contract_number', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'user']


class CasketSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    history = CasketTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Casket
        fields = [
            'id', 'casket_id', 'model', 'casket_type', 'size', 'color',
            'material', 'supplier', 'purchase_cost', 'selling_price',
            'quantity', 'location', 'location_details', 'condition',
            'condition_display', 'status', 'status_display',
            'date_received', 'notes', 'history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'condition_display', 'status_display', 'created_at', 'updated_at']
