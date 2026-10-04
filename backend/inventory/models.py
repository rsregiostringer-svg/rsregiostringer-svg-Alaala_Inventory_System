from django.db import models
from django.core.exceptions import ValidationError
from core.models import Location, User


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class InventoryItem(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        LOW_STOCK = 'LOW_STOCK', 'Low Stock'
        OUT_OF_STOCK = 'OUT_OF_STOCK', 'Out of Stock'

    item_name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='items')
    description = models.TextField(blank=True, default='')
    unit = models.CharField(max_length=50, default='pcs')  # pcs, sets, rolls, boxes, bottles
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='inventory_items')
    current_quantity = models.IntegerField(default=0)
    minimum_stock = models.IntegerField(default=5)
    maximum_stock = models.IntegerField(default=100)
    supplier = models.CharField(max_length=200, blank=True, default='')
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item_name', 'location']
        unique_together = ('item_name', 'location')

    def calculate_status(self):
        if self.current_quantity <= 0:
            return self.Status.OUT_OF_STOCK
        elif self.current_quantity <= self.minimum_stock:
            return self.Status.LOW_STOCK
        return self.Status.AVAILABLE

    def clean(self):
        if self.current_quantity < 0:
            raise ValidationError({'current_quantity': 'Current quantity cannot be negative.'})

    def save(self, *args, **kwargs):
        self.clean()
        self.status = self.calculate_status()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} ({self.location.name}) - Qty: {self.current_quantity}"


class InventoryTransaction(models.Model):
    class TransactionType(models.TextChoices):
        STOCK_IN = 'STOCK_IN', 'Stock In'
        STOCK_OUT = 'STOCK_OUT', 'Stock Out'
        TRANSFER = 'TRANSFER', 'Transfer'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
        RETURN = 'RETURN', 'Return'
        DAMAGED = 'DAMAGED', 'Damaged'
        LOST = 'LOST', 'Lost'
        CONSUMED = 'CONSUMED', 'Consumed'

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.IntegerField()
    from_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_from')
    to_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_to')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    reason = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} - {self.item.item_name} ({self.quantity}) on {self.created_at.strftime('%Y-%m-%d %H:%M')}"
