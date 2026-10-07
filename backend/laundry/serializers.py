from rest_framework import serializers
from .models import LaundryRecord, LaundryRecordItem
from core.serializers import LocationSerializer

class LaundryRecordItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LaundryRecordItem
        fields = ['id', 'item_description', 'quantity', 'unit']

class LaundryRecordSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = LaundryRecordItemSerializer(many=True, required=False)

    class Meta:
        model = LaundryRecord
        fields = [
            'id', 'location', 'location_details', 'item', 'quantity', 'total_quantity',
            'items',
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
        read_only_fields = ['id', 'status', 'status_display', 'created_at', 'updated_at', 'total_quantity']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        record = LaundryRecord.objects.create(**validated_data)
        
        total_qty = 0
        for item_data in items_data:
            LaundryRecordItem.objects.create(laundry_record=record, **item_data)
            total_qty += item_data.get('quantity', 0)
        
        if items_data:
            record.total_quantity = total_qty
            record.save(update_fields=['total_quantity'])
            
        return record

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if items_data is not None:
            # We recreate items to simplify updates, or map by id
            instance.items.all().delete()
            total_qty = 0
            for item_data in items_data:
                # remove id if it exists from input so we create a new one safely
                item_data.pop('id', None)
                LaundryRecordItem.objects.create(laundry_record=instance, **item_data)
                total_qty += item_data.get('quantity', 0)
            instance.total_quantity = total_qty
            instance.save(update_fields=['total_quantity'])
            
        return instance
