from django.contrib import admin
from .models import WaterBill, ElectricityBill


@admin.register(WaterBill)
class WaterBillAdmin(admin.ModelAdmin):
    list_display = ('location', 'billing_period', 'meter_number', 'previous_reading', 'current_reading', 'consumption', 'amount', 'payment_status', 'due_date', 'date_paid')
    list_filter = ('payment_status', 'location', 'due_date')
    search_fields = ('location__name', 'meter_number', 'billing_period', 'provider', 'notes')
    ordering = ('-due_date', '-id')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ElectricityBill)
class ElectricityBillAdmin(admin.ModelAdmin):
    list_display = ('location', 'billing_period', 'meter_number', 'previous_reading', 'current_reading', 'consumption', 'amount', 'payment_status', 'due_date', 'date_paid')
    list_filter = ('payment_status', 'location', 'due_date')
    search_fields = ('location__name', 'meter_number', 'billing_period', 'provider', 'notes')
    ordering = ('-due_date', '-id')
    readonly_fields = ('created_at', 'updated_at')
