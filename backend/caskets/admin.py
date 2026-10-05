from django.contrib import admin
from .models import (
    Casket, CasketTransaction, Buyer, Deceased, Chapel,
    CasketSale, LamayRecord, ChapelTurnover
)


@admin.register(Casket)
class CasketAdmin(admin.ModelAdmin):
    list_display = ('casket_id', 'model', 'casket_type', 'location', 'condition', 'status', 'quantity', 'purchase_cost', 'selling_price', 'date_received')
    list_filter = ('status', 'condition', 'casket_type', 'location', 'date_received')
    search_fields = ('casket_id', 'model', 'casket_type', 'color', 'material', 'supplier', 'notes')
    ordering = ('casket_id',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CasketTransaction)
class CasketTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'casket', 'action', 'previous_status', 'new_status', 'deceased_name', 'contract_number', 'user')
    list_filter = ('action', 'created_at')
    search_fields = ('casket__casket_id', 'casket__model', 'deceased_name', 'contract_number', 'notes')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'contact_number', 'relationship_to_deceased', 'created_at')
    search_fields = ('full_name', 'contact_number', 'address', 'relationship_to_deceased', 'notes')
    ordering = ('full_name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Deceased)
class DeceasedAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'date_of_death', 'age', 'sex', 'funeral_case_id', 'created_at')
    list_filter = ('sex', 'date_of_death')
    search_fields = ('full_name', 'funeral_case_id', 'notes')
    ordering = ('full_name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Chapel)
class ChapelAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'status', 'capacity', 'location', 'is_active')
    list_filter = ('status', 'is_active', 'location')
    search_fields = ('code', 'name', 'description')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CasketSale)
class CasketSaleAdmin(admin.ModelAdmin):
    list_display = ('sale_id', 'casket', 'buyer', 'deceased', 'chapel', 'selling_price', 'service_status', 'date_sold', 'encoded_by')
    list_filter = ('service_status', 'date_sold', 'chapel')
    search_fields = ('sale_id', 'casket__casket_id', 'casket__model', 'buyer__full_name', 'deceased__full_name')
    ordering = ('-date_sold',)
    readonly_fields = ('date_sold', 'updated_at')


@admin.register(LamayRecord)
class LamayRecordAdmin(admin.ModelAdmin):
    list_display = ('lamay_id', 'chapel', 'deceased', 'buyer', 'casket', 'status', 'lamay_start_date', 'expected_burial_date', 'burial_time')
    list_filter = ('status', 'chapel', 'lamay_start_date', 'expected_burial_date')
    search_fields = ('lamay_id', 'deceased__full_name', 'buyer__full_name', 'funeral_case_id', 'notes')
    ordering = ('-lamay_start_date',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ChapelTurnover)
class ChapelTurnoverAdmin(admin.ModelAdmin):
    list_display = ('id', 'chapel', 'deceased_name', 'completed_at', 'checked_by_name', 'chapel_ready')
    list_filter = ('chapel', 'completed_at', 'chapel_ready')
    search_fields = ('chapel__name', 'deceased_name', 'checked_by_name', 'notes')
    ordering = ('-completed_at',)
    readonly_fields = ('completed_at',)
