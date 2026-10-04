from rest_framework import serializers
from .models import WaterBill, ElectricityBill
from core.serializers import LocationSerializer


class WaterBillSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = WaterBill
        fields = [
            'id', 'location', 'location_details', 'provider', 'meter_number',
            'previous_reading', 'current_reading', 'consumption', 'billing_period',
            'bill_date', 'due_date', 'amount', 'payment_status',
            'payment_status_display', 'date_paid', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'consumption', 'payment_status_display', 'created_at', 'updated_at']


class ElectricityBillSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = ElectricityBill
        fields = [
            'id', 'location', 'location_details', 'provider', 'meter_number',
            'previous_reading', 'current_reading', 'consumption', 'billing_period',
            'bill_date', 'due_date', 'amount', 'payment_status',
            'payment_status_display', 'date_paid', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'consumption', 'payment_status_display', 'created_at', 'updated_at']
