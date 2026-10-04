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

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STAFF
    )
    phone_number = models.CharField(max_length=30, blank=True, default='')
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_users'
    )

    class Meta:
        ordering = ['-date_joined']

    @property
    def is_master_admin(self):
        return self.role == self.Role.MASTER_ADMIN or self.is_superuser

    @property
    def is_admin_or_higher(self):
        return self.role in [self.Role.MASTER_ADMIN, self.Role.ADMIN] or self.is_superuser

    @property
    def is_manager_or_higher(self):
        return self.role in [self.Role.MASTER_ADMIN, self.Role.ADMIN, self.Role.MANAGER] or self.is_superuser


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
