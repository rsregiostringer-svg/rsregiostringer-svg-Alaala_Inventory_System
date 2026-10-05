from django.contrib import admin
from .models import Category, InventoryItem, InventoryTransaction


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('name',)


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'category', 'location', 'current_quantity', 'minimum_stock', 'unit', 'status', 'cost', 'is_active')
    list_filter = ('status', 'category', 'location', 'is_active')
    search_fields = ('item_name', 'description', 'supplier')
    ordering = ('item_name', 'location')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'transaction_type', 'item', 'quantity', 'from_location', 'to_location', 'user', 'reason')
    list_filter = ('transaction_type', 'created_at', 'from_location', 'to_location')
    search_fields = ('item__item_name', 'reason', 'notes')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
