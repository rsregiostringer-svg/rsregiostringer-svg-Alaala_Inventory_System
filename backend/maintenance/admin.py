from django.contrib import admin
from .models import Maintenance


@admin.register(Maintenance)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = ('maintenance_id', 'location', 'category', 'issue', 'priority', 'status', 'reported_by', 'assigned_to', 'cost', 'date_reported', 'date_completed')
    list_filter = ('status', 'priority', 'category', 'location', 'date_reported')
    search_fields = ('maintenance_id', 'issue', 'description', 'reported_by', 'assigned_to', 'notes')
    ordering = ('-date_reported', '-id')
    readonly_fields = ('created_at', 'updated_at')
