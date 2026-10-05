from django.contrib.auth.models import AbstractUser
from django.db import models


class Location(models.Model):
    """
    Physical or operational locations for Alaala Funeral Homes:
    NO CODE (Laundry monitoring for uncoded items), SERVICES, C2, C3, NC2, NC3, OFFICE
    """
    name = models.CharField(max_length=100, unique=True)
    code = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        MASTER_ADMIN = 'MASTER_ADMIN', 'Master Admin'
        ADMIN = 'ADMIN', 'Admin'
        MANAGER = 'MANAGER', 'Manager'
        STAFF = 'STAFF', 'Staff'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STAFF
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    shift = models.CharField(max_length=50, blank=True, default='8am to 5pm')
    phone_number = models.CharField(max_length=30, blank=True, default='')
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_users'
    )
    assigned_locations = models.ManyToManyField(
        Location,
        blank=True,
        related_name='assigned_staff_members'
    )
    custom_permissions = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-date_joined']

    @property
    def is_master_admin(self):
        return self.role == self.Role.MASTER_ADMIN or self.is_superuser

    @property
    def is_simple_admin(self):
        return self.role == self.Role.ADMIN and not self.is_master_admin

    @property
    def is_staff_role(self):
        return self.role == self.Role.STAFF

    @property
    def is_admin_or_higher(self):
        return self.role in [self.Role.MASTER_ADMIN, self.Role.ADMIN] or self.is_superuser

    @property
    def is_manager_or_higher(self):
        return self.role in [self.Role.MASTER_ADMIN, self.Role.ADMIN, self.Role.MANAGER] or self.is_superuser

    def get_accessible_location_ids(self):
        """Returns list of Location IDs this user can access."""
        if self.is_master_admin:
            return list(Location.objects.values_list('id', flat=True))
        ids = set()
        if self.location_id:
            ids.add(self.location_id)
        for loc_id in self.assigned_locations.values_list('id', flat=True):
            ids.add(loc_id)
        return list(ids)

    def has_custom_perm(self, perm_name):
        if self.is_master_admin:
            return True
        if not isinstance(self.custom_permissions, dict):
            return False
        return bool(self.custom_permissions.get(perm_name, False))


class AuditLog(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    user_repr = models.CharField(max_length=150, blank=True, default='')
    action = models.CharField(max_length=50)  # CREATE, UPDATE, DELETE, TRANSFER, STAGE_CHANGE, STATUS_CHANGE
    module = models.CharField(max_length=50)  # INVENTORY, LAUNDRY, CASKETS, MAINTENANCE, WATER, ELECTRICITY, USERS, AUTH
    record_id = models.CharField(max_length=100, blank=True, default='')
    record_repr = models.CharField(max_length=255, blank=True, default='')
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.user_repr}: {self.description}"


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    description = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key

