from django.contrib import admin
from .models import LaundryRecord


@admin.register(LaundryRecord)
class LaundryRecordAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'item', 'quantity', 'location', 'status',
        'laundry_in_date', 'laundry_in_shift', 'laundry_in_charge',
        'laba_date', 'laba_in_charge',
        'banlaw_date', 'banlaw_in_charge',
        'sampay_date', 'sampay_in_charge',
        'pinaw_date', 'pinaw_in_charge',
        'tiklop_date', 'tiklop_in_charge',
        'date_returned', 'returned_by',
        'encoded_by'
    )
    list_filter = ('status', 'location', 'laundry_in_date', 'laundry_in_shift')
    search_fields = (
        'item', 'laundry_in_charge', 'laba_in_charge', 'banlaw_in_charge',
        'sampay_in_charge', 'pinaw_in_charge', 'tiklop_in_charge',
        'returned_by', 'encoded_by', 'notes'
    )
    ordering = ('-laundry_in_date', '-id')
    readonly_fields = ('created_at', 'updated_at')
