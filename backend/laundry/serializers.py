from rest_framework import serializers
from .models import LaundryRecord
from core.serializers import LocationSerializer


class LaundryRecordSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LaundryRecord
        fields = [
            'id', 'location', 'location_details', 'item', 'quantity',
            # 1. Laundry IN
            'laundry_in_date', 'laundry_in_time', 'laundry_in_shift', 'laundry_in_charge',
            # 4. Laba
            'laba_date', 'laba_time', 'laba_shift', 'laba_in_charge',
            # 5. Banlaw
            'banlaw_date', 'banlaw_time', 'banlaw_shift', 'banlaw_in_charge',
            # 6. Sampay
            'sampay_date', 'sampay_time', 'sampay_shift', 'sampay_in_charge',
            # 7. Pinaw
            'pinaw_date', 'pinaw_time', 'pinaw_shift', 'pinaw_in_charge',
            # 8. Tiklop
            'tiklop_date', 'tiklop_time', 'tiklop_shift', 'tiklop_in_charge',
            # 9. Returned
            'date_returned', 'returned_time', 'returned_by',
            # 10. Encoded By
            'encoded_by',
            'status', 'status_display', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'status_display', 'created_at', 'updated_at']
