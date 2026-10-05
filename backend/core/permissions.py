from rest_framework import permissions


class IsMasterAdmin(permissions.BasePermission):
    """Full unrestricted access across all modules, locations, and settings."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class IsSimpleAdmin(permissions.BasePermission):
    """Operational administration for assigned branches/modules."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.is_master_admin or request.user.is_simple_admin)
        )


class IsStaff(permissions.BasePermission):
    """Basic operational staff access."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class CanManageUsers(permissions.BasePermission):
    """Only Master Admin can create, delete, and configure system user accounts."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class CanViewAuditLogs(permissions.BasePermission):
    """Only Master Admin can inspect system security audit logs."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class CanViewReports(permissions.BasePermission):
    """Master Admin or user explicitly granted report viewing permission."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_master_admin or request.user.has_custom_perm('reports')


class CanViewAnalytics(permissions.BasePermission):
    """Only Master Admin can inspect executive analytics & performance metrics."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class CanManageSettings(permissions.BasePermission):
    """Only Master Admin can modify system configuration and preferences."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class CanManageLocations(permissions.BasePermission):
    """Only Master Admin can create or delete facility locations."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class CanManageShifts(permissions.BasePermission):
    """Only Master Admin can manage system shift schedules."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_master_admin)


class CanManageInventory(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class CanManageLaundry(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class CanManageCaskets(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class CanManageMaintenance(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class CanAccessWater(permissions.BasePermission):
    """Master Admin, Simple Admin, or Staff with explicit water permission."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_master_admin or request.user.is_simple_admin:
            return True
        return request.user.has_custom_perm('water')


class CanAccessElectricity(permissions.BasePermission):
    """Master Admin, Simple Admin, or Staff with explicit electricity permission."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_master_admin or request.user.is_simple_admin:
            return True
        return request.user.has_custom_perm('electricity')


# Legacy aliases for backward compatibility
IsAdminOrHigher = IsSimpleAdmin
IsManagerOrHigher = IsSimpleAdmin
ReadOnlyOrManager = IsStaff
