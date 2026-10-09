from django.db import models
from core.models import Location, User


class PaymentStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    PAID = 'PAID', 'Paid'
    OVERDUE = 'OVERDUE', 'Overdue'


class WaterBill(models.Model):
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='water_bills')
    water_source = models.CharField(max_length=150, default='Unspecified')
    tank = models.CharField(max_length=100)
    
    # Billing fields (preserved for legacy and dual-use if needed)
    billing_period = models.CharField(max_length=100, null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    date_paid = models.DateField(null=True, blank=True)
    
    # Tank monitoring fields
    date = models.DateField()
    patient_name = models.CharField(max_length=200, blank=True, default='')
    shift = models.CharField(max_length=100, blank=True, default='')
    
    initial_level = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    initial_additional = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    initial_checked_by = models.CharField(max_length=150, blank=True, default='')
    initial_remarks = models.CharField(max_length=255, blank=True, default='')
    
    subsequent_level = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    subsequent_additional = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    subsequent_checked_by = models.CharField(max_length=150, blank=True, default='')
    subsequent_remarks = models.CharField(max_length=255, blank=True, default='')
    
    refilled_gallons = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    consumption = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    encoded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='water_encoded')
    flagged = models.BooleanField(default=False)
    
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['date', 'water_source', 'location', 'tank', 'shift'],
                name='unique_water_tank_reading_per_shift'
            )
        ]

    def calculate_consumption(self):
        # Formula: Total Consumed = Initial Water Level + Initial Additional Water - Subsequent Water Level - Subsequent Additional Water
        from decimal import Decimal
        initial = Decimal(str(self.initial_level or 0))
        initial_add = Decimal(str(self.initial_additional or 0))
        subsequent = Decimal(str(self.subsequent_level or 0))
        subsequent_add = Decimal(str(self.subsequent_additional or 0))
        return initial + initial_add - subsequent - subsequent_add

    def save(self, *args, **kwargs):
        # Determine if this is a legacy save by checking if it's already saved and we're not changing levels
        is_legacy_meter_reading = False
        if self.pk:
            try:
                old = WaterBill.objects.get(pk=self.pk)
                # If old record had subsequent > initial, and it was using old consumption formula
                if old.subsequent_level and old.subsequent_level > old.initial_level and old.consumption == (old.subsequent_level - old.initial_level):
                    # Check if levels were changed
                    if old.initial_level == self.initial_level and old.subsequent_level == self.subsequent_level:
                        is_legacy_meter_reading = True
            except WaterBill.DoesNotExist:
                pass

        if is_legacy_meter_reading:
            # Preserve old calculation for legacy meter readings
            self.consumption = max(self.subsequent_level - self.initial_level, 0)
        else:
            self.consumption = self.calculate_consumption()
            
        if self.consumption < 0:
            self.flagged = True
        else:
            self.flagged = False
            
        super().save(*args, **kwargs)

    def __str__(self):
        if self.patient_name:
            return f"Tank Monitoring - {self.location.name} - {self.date}"
        return f"Water Bill - {self.location.name} - {self.date}"


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
