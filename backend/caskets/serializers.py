from rest_framework import serializers
from .models import (
    Casket, CasketTransaction, Buyer, Deceased, Chapel,
    CasketSale, LamayRecord, ChapelTurnover
)
from core.serializers import LocationSerializer


class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = [
            'id', 'first_name', 'middle_name', 'last_name', 'full_name',
            'contact_number', 'address',
            'relationship_to_deceased', 'relationship_other',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'full_name', 'created_at', 'updated_at']


class DeceasedSerializer(serializers.ModelSerializer):
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)

    class Meta:
        model = Deceased
        fields = [
            'id', 'first_name', 'middle_name', 'last_name', 'suffix', 'full_name',
            'date_of_birth', 'date_of_death', 'age', 'sex', 'sex_display',
            'address', 'cause_of_death',
            'funeral_case_id', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'full_name', 'sex_display', 'created_at', 'updated_at']


class CasketTransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = CasketTransaction
        fields = [
            'id', 'casket', 'action', 'user', 'user_name', 'user_full_name',
            'previous_status', 'new_status', 'deceased_name',
            'contract_number', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'user', 'user_name', 'user_full_name']

    def get_user_full_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'System'


class CasketSaleSummarySerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    deceased_name = serializers.CharField(source='deceased.full_name', read_only=True)
    chapel_name = serializers.SerializerMethodField()

    class Meta:
        model = CasketSale
        fields = [
            'id', 'sale_id', 'buyer_name', 'deceased_name', 'chapel_name',
            'is_residence', 'residence_address',
            'selling_price', 'service_status', 'date_sold'
        ]

    def get_chapel_name(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "No Chapel"


class CasketSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    history = CasketTransactionSerializer(many=True, read_only=True)
    sales = CasketSaleSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Casket
        fields = [
            'id', 'casket_id', 'model', 'casket_type', 'size', 'color',
            'material', 'supplier', 'purchase_cost', 'selling_price',
            'quantity', 'location', 'location_details', 'condition',
            'condition_display', 'status', 'status_display',
            'date_received', 'notes', 'history', 'sales', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'condition_display', 'status_display', 'created_at', 'updated_at']


class LamayRecordSummarySerializer(serializers.ModelSerializer):
    deceased_name = serializers.CharField(source='deceased.full_name', read_only=True)
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_contact = serializers.CharField(source='buyer.contact_number', read_only=True)
    casket_model = serializers.CharField(source='casket.model', read_only=True, default='')
    casket_id = serializers.CharField(source='casket.casket_id', read_only=True, default='')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    chapel_name = serializers.SerializerMethodField()
    venue_display = serializers.SerializerMethodField()

    class Meta:
        model = LamayRecord
        fields = [
            'id', 'lamay_id', 'chapel', 'chapel_name', 'venue_display',
            'is_residence', 'residence_address',
            'deceased', 'deceased_name', 'buyer', 'buyer_name', 'buyer_contact',
            'casket', 'casket_id', 'casket_model', 'funeral_case_id',
            'lamay_start_date', 'lamay_start_time', 'expected_end_date', 'expected_end_time',
            'expected_burial_date', 'burial_time', 'status', 'status_display', 'notes',
            'service_type', 'discount'
        ]

    def get_chapel_name(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "Residence / Home Viewing"

    def get_venue_display(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "Residence / Home Viewing"


class ChapelSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True, default='')
    current_lamay = serializers.SerializerMethodField()
    upcoming_reservations = serializers.SerializerMethodField()

    class Meta:
        model = Chapel
        fields = [
            'id', 'name', 'code', 'description', 'capacity', 'status',
            'status_display', 'location', 'location_name', 'is_active',
            'current_lamay', 'upcoming_reservations', 'created_at', 'updated_at',
            'occupied', 'available'
        ]
        read_only_fields = ['id', 'status_display', 'location_name', 'created_at', 'updated_at', 'occupied', 'available']

    def get_current_lamay(self, obj):
        active = obj.get_active_lamay()
        if active:
            return LamayRecordSummarySerializer(active).data
        return None

    def get_upcoming_reservations(self, obj):
        upcoming = obj.get_upcoming_reservations()[:3]
        return LamayRecordSummarySerializer(upcoming, many=True).data


class LamayRecordSerializer(serializers.ModelSerializer):
    chapel_details = ChapelSerializer(source='chapel', read_only=True)
    deceased_details = DeceasedSerializer(source='deceased', read_only=True)
    buyer_details = BuyerSerializer(source='buyer', read_only=True)
    casket_details = CasketSerializer(source='casket', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    wake_location_display = serializers.CharField(source='get_wake_location_display', read_only=True)
    chapel_name = serializers.SerializerMethodField()
    venue_display = serializers.SerializerMethodField()
    encoded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LamayRecord
        fields = [
            'id', 'lamay_id', 'chapel', 'chapel_details', 'chapel_name', 'venue_display',
            'wake_location', 'wake_location_display',
            'is_residence', 'residence_address',
            'deceased', 'deceased_details', 'buyer', 'buyer_details',
            'casket', 'casket_details', 'casket_sale', 'funeral_case_id',
            'lamay_start_date', 'lamay_start_time', 'expected_end_date', 'expected_end_time',
            'expected_burial_date', 'burial_time', 'assigned_staff',
            'service_type', 'discount',
            'status', 'status_display',
            'notes', 'encoded_by', 'encoded_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status_display', 'wake_location_display', 'encoded_by', 'encoded_by_name', 'created_at', 'updated_at']

    def validate(self, attrs):
        chapel = attrs.get('chapel')
        status = attrs.get('status')
        instance = self.instance
        
        is_active_status = status in [
            'ARRANGEMENT', 'RESERVED', 'PREPARING', 'ACTIVE', 'READY_FOR_BURIAL', 'FOR_BURIAL'
        ]
        
        if not status and instance:
            is_active_status = instance.status in [
                'ARRANGEMENT', 'RESERVED', 'PREPARING', 'ACTIVE', 'READY_FOR_BURIAL', 'FOR_BURIAL'
            ]
            
        if not chapel and instance and 'chapel' not in attrs:
            chapel = instance.chapel
            
        # Also check if it's residence, if so chapel can be ignored
        is_residence = attrs.get('is_residence')
        if is_residence is None and instance:
            is_residence = instance.is_residence
            
        if chapel and is_active_status and not is_residence:
            if not instance or instance.chapel != chapel or (instance.status not in [
                'ARRANGEMENT', 'RESERVED', 'PREPARING', 'ACTIVE', 'READY_FOR_BURIAL', 'FOR_BURIAL'
            ]):
                if chapel.available <= 0:
                    raise serializers.ValidationError({"chapel": f"Chapel '{chapel.name}' is at full capacity."})
                    
        return attrs

    def get_chapel_name(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "Residence / Home Viewing"

    def get_venue_display(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "Residence / Home Viewing"

    def get_encoded_by_name(self, obj):
        if obj.encoded_by:
            return obj.encoded_by.get_full_name() or obj.encoded_by.username
        return 'System'


class CasketSaleSerializer(serializers.ModelSerializer):
    casket_details = CasketSerializer(source='casket', read_only=True)
    buyer_details = BuyerSerializer(source='buyer', read_only=True)
    deceased_details = DeceasedSerializer(source='deceased', read_only=True)
    chapel_details = ChapelSerializer(source='chapel', read_only=True)
    chapel_name = serializers.SerializerMethodField()
    venue_display = serializers.SerializerMethodField()
    encoded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CasketSale
        fields = [
            'id', 'sale_id', 'casket', 'casket_details',
            'buyer', 'buyer_details', 'deceased', 'deceased_details',
            'chapel', 'chapel_details', 'chapel_name', 'venue_display',
            'is_residence', 'residence_address', 'selling_price',
            'lamay_start_date', 'lamay_start_time', 'expected_burial_date', 'burial_time',
            'service_status', 'notes', 'encoded_by', 'encoded_by_name',
            'date_sold', 'updated_at'
        ]
        read_only_fields = ['id', 'encoded_by', 'encoded_by_name', 'date_sold', 'updated_at']

    def get_chapel_name(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "No Chapel"

    def get_venue_display(self, obj):
        if obj.is_residence:
            return f"Residence ({obj.residence_address})" if obj.residence_address else "Residence / Home Viewing"
        return obj.chapel.name if obj.chapel else "No Chapel"

    def get_encoded_by_name(self, obj):
        if obj.encoded_by:
            return obj.encoded_by.get_full_name() or obj.encoded_by.username
        return 'System'


class ChapelTurnoverSerializer(serializers.ModelSerializer):
    chapel_name = serializers.CharField(source='chapel.name', read_only=True)
    is_all_checked = serializers.BooleanField(read_only=True)

    class Meta:
        model = ChapelTurnover
        fields = [
            'id', 'chapel', 'chapel_name', 'lamay_record', 'deceased_name',
            'casket_removed', 'chairs_arranged', 'tables_cleaned',
            'floor_cleaned', 'bathroom_checked', 'trash_removed',
            'equipment_checked', 'inventory_checked', 'chapel_ready',
            'notes', 'checked_by', 'checked_by_name', 'completed_at',
            'is_all_checked'
        ]
        read_only_fields = ['id', 'completed_at', 'checked_by', 'checked_by_name', 'is_all_checked']
