from django.db import models
from core.models import Location, User


class Casket(models.Model):
    class Condition(models.TextChoices):
        NEW = 'NEW', 'New'
        GOOD = 'GOOD', 'Good'
        NEEDS_REPAIR = 'NEEDS_REPAIR', 'Needs Repair'
        DAMAGED = 'DAMAGED', 'Damaged'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        RESERVED = 'RESERVED', 'Reserved'
        SOLD = 'SOLD', 'Sold'
        USED = 'USED', 'Used'
        FOR_REPAIR = 'FOR_REPAIR', 'For Repair'
        OUT_OF_STOCK = 'OUT_OF_STOCK', 'Out of Stock'

    casket_id = models.CharField(max_length=50, unique=True)
    model = models.CharField(max_length=150)
    casket_type = models.CharField(max_length=100)  # Wood, Metal, Semi-Metal, Cremation, Oversized
    size = models.CharField(max_length=50, default='Standard Adult')
    color = models.CharField(max_length=100)
    material = models.CharField(max_length=150)
    supplier = models.CharField(max_length=200, blank=True, default='')
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    quantity = models.IntegerField(default=1)
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='caskets')
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.NEW)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    date_received = models.DateField()
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['casket_id']

    def __str__(self):
        return f"{self.casket_id} - {self.model} ({self.location.name}) [{self.get_status_display()}]"


class CasketTransaction(models.Model):
    class Action(models.TextChoices):
        RECEIVE = 'RECEIVE', 'Receive Stock'
        RESERVE = 'RESERVE', 'Reserve'
        UNRESERVE = 'UNRESERVE', 'Cancel Reservation'
        SELL = 'SELL', 'Sell'
        USE = 'USE', 'Use in Service'
        MARK_FOR_REPAIR = 'MARK_FOR_REPAIR', 'Mark for Repair'
        REPAIR_COMPLETE = 'REPAIR_COMPLETE', 'Repair Complete'
        TRANSFER = 'TRANSFER', 'Transfer Location'

    casket = models.ForeignKey(Casket, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=30, choices=Action.choices)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    previous_status = models.CharField(max_length=20, blank=True, default='')
    new_status = models.CharField(max_length=20, blank=True, default='')
    deceased_name = models.CharField(max_length=200, blank=True, default='')
    contract_number = models.CharField(max_length=100, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.casket.casket_id}: {self.action} on {self.created_at.strftime('%Y-%m-%d %H:%M')}"
