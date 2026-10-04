from rest_framework import serializers
from .models import Maintenance
from core.serializers import LocationSerializer


class MaintenanceSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Maintenance
        fields = [
            'id', 'maintenance_id', 'location', 'location_details',
            'category', 'issue', 'description', 'priority', 'priority_display',
            'reported_by', 'date_reported', 'assigned_to', 'target_date',
            'date_completed', 'status', 'status_display', 'cost', 'notes',
            'photo', 'photo_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'priority_display', 'status_display', 'created_at', 'updated_at']
