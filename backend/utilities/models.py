from django.db import models
from core.models import Location, User


class PaymentStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    PAID = 'PAID', 'Paid'
    OVERDUE = 'OVERDUE', 'Overdue'


class WaterBill(models.Model):
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='water_bills')
    provider = models.CharField(max_length=150, default='Maynilad / Local Water District')
    meter_number = models.CharField(max_length=100)
    previous_reading = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    current_reading = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    consumption = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # cubic meters (m3)
    billing_period = models.CharField(max_length=100)  # e.g., October 2026
    bill_date = models.DateField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    date_paid = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date', '-id']

    def calculate_consumption(self):
        val = self.current_reading - self.previous_reading
        return max(val, 0)

    def save(self, *args, **kwargs):
        self.consumption = self.calculate_consumption()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Water Bill - {self.location.name} ({self.billing_period}) - PHP {self.amount}"


class ElectricityBill(models.Model):
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='electricity_bills')
    provider = models.CharField(max_length=150, default='Meralco / Local Electric Coop')
    meter_number = models.CharField(max_length=100)
    previous_reading = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    current_reading = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    consumption = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # kilowatt-hours (kWh)
    billing_period = models.CharField(max_length=100)
    bill_date = models.DateField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    date_paid = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date', '-id']

    def calculate_consumption(self):
        val = self.current_reading - self.previous_reading
        return max(val, 0)

    def save(self, *args, **kwargs):
        self.consumption = self.calculate_consumption()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Electricity Bill - {self.location.name} ({self.billing_period}) - PHP {self.amount}"
