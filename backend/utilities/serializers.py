from rest_framework import serializers
from .models import WaterBill, ElectricityBill
from core.serializers import LocationSerializer


class WaterBillSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    encoded_by_name = serializers.CharField(source='encoded_by.get_full_name', read_only=True, default='')

    class Meta:
        model = WaterBill
        fields = [
            'id', 'location', 'location_details', 'water_source', 'tank',
            'date', 'patient_name', 'shift',
            'initial_level', 'initial_additional', 'initial_checked_by', 'initial_remarks',
            'subsequent_level', 'subsequent_additional', 'subsequent_checked_by', 'subsequent_remarks',
            'refilled_gallons', 'consumption', 'encoded_by', 'encoded_by_name', 'flagged',
            'billing_period', 'due_date', 'amount', 'payment_status',
            'payment_status_display', 'date_paid', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'consumption', 'payment_status_display', 'encoded_by_name', 'created_at', 'updated_at']


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
