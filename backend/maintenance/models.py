from django.db import models
from core.models import Location, User


class Maintenance(models.Model):
    class Category(models.TextChoices):
        ELECTRICAL = 'Electrical', 'Electrical'
        PLUMBING = 'Plumbing', 'Plumbing'
        WATER = 'Water', 'Water'
        AIR_CONDITIONING = 'Air Conditioning', 'Air Conditioning'
        LIGHTING = 'Lighting', 'Lighting'
        FURNITURE = 'Furniture', 'Furniture'
        DOORS_LOCKS = 'Doors/Locks', 'Doors/Locks'
        CEILING_ROOF = 'Ceiling/Roof', 'Ceiling/Roof'
        WALLS_PAINT = 'Walls/Paint', 'Walls/Paint'
        BATHROOM = 'Bathroom', 'Bathroom'
        CLEANING = 'Cleaning', 'Cleaning'
        EQUIPMENT = 'Equipment', 'Equipment'
        OTHER = 'Other', 'Other'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    class Status(models.TextChoices):
        REPORTED = 'REPORTED', 'Reported'
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    maintenance_id = models.CharField(max_length=50, unique=True)
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='maintenance_requests')
    category = models.CharField(max_length=50, choices=Category.choices)
    issue = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    reported_by = models.CharField(max_length=150)
    date_reported = models.DateField()
    assigned_to = models.CharField(max_length=150, blank=True, default='')
    target_date = models.DateField(null=True, blank=True)
    date_completed = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REPORTED)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, default='')
    photo = models.FileField(upload_to='maintenance/%Y/%m/', null=True, blank=True)
    photo_url = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_reported', '-id']

    def __str__(self):
        return f"{self.maintenance_id} ({self.location.name}): {self.issue} [{self.get_status_display()}]"
