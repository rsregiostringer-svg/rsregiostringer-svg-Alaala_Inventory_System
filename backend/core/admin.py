from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Location, User, AuditLog, SystemSetting


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code', 'description')
    ordering = ('name',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'role', 'status', 'location', 'is_staff', 'is_superuser')
    list_filter = ('role', 'status', 'is_staff', 'is_superuser', 'location')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('-date_joined',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Alaala System Access & Role', {
            'fields': ('role', 'status', 'shift', 'phone_number', 'location', 'assigned_locations', 'custom_permissions')
        }),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user_repr', 'action', 'module', 'record_id', 'description')
    list_filter = ('action', 'module', 'timestamp')
    search_fields = ('user_repr', 'action', 'module', 'record_id', 'description')
    readonly_fields = ('timestamp', 'user', 'user_repr', 'action', 'module', 'record_id', 'record_repr', 'old_value', 'new_value', 'description', 'ip_address')
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'description', 'updated_at')
    search_fields = ('key', 'description')
