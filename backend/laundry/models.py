from django.db import models
from core.models import Location, User


class LaundryRecord(models.Model):
    """
    Exact monitoring structure for Alaala Funeral Homes Laundry Management:
    1. Laundry IN (Date / Shift / In Charge)
    2. Items
    3. Quantity
    4. Laba (Date / Shift / In Charge)
    5. Banlaw (Date / Shift / In Charge)
    6. Sampay (Date / Shift / In Charge)
    7. Pinaw (Date / Shift / In Charge)
    8. Tiklop (Date / Shift / In Charge)
    9. Date Returned / By
    10. Encoded By
    """
    class Status(models.TextChoices):
        LAUNDRY_IN = 'LAUNDRY_IN', 'Laundry IN'
        FOR_LABA = 'FOR_LABA', 'For Laba'
        LABA = 'LABA', 'Laba (Washing)'
        FOR_BANLAW = 'FOR_BANLAW', 'For Banlaw'
        BANLAW = 'BANLAW', 'Banlaw (Rinsing)'
        FOR_SAMPAY = 'FOR_SAMPAY', 'For Sampay'
        SAMPAY = 'SAMPAY', 'Sampay (Hanging)'
        FOR_PINAW = 'FOR_PINAW', 'For Pinaw'
        PINAW = 'PINAW', 'Pinaw (Ironing)'
        FOR_TIKLOP = 'FOR_TIKLOP', 'For Tiklop'
        TIKLOP = 'TIKLOP', 'Tiklop (Folding)'
        READY_FOR_RETURN = 'READY_FOR_RETURN', 'Ready for Return'
        RETURNED = 'RETURNED', 'Returned'

    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='laundry_records')
    item = models.CharField(max_length=200)
    quantity = models.IntegerField(default=1)

    # 1. Laundry IN
    laundry_in_date = models.DateField()
    laundry_in_shift = models.CharField(max_length=50)  # Morning, Afternoon, Night
    laundry_in_charge = models.CharField(max_length=150)

    # 4. Laba (Washing)
    laba_date = models.DateField(null=True, blank=True)
    laba_shift = models.CharField(max_length=50, blank=True, default='')
    laba_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 5. Banlaw (Rinsing)
    banlaw_date = models.DateField(null=True, blank=True)
    banlaw_shift = models.CharField(max_length=50, blank=True, default='')
    banlaw_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 6. Sampay (Hanging)
    sampay_date = models.DateField(null=True, blank=True)
    sampay_shift = models.CharField(max_length=50, blank=True, default='')
    sampay_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 7. Pinaw (Ironing/Pressing)
    pinaw_date = models.DateField(null=True, blank=True)
    pinaw_shift = models.CharField(max_length=50, blank=True, default='')
    pinaw_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 8. Tiklop (Folding)
    tiklop_date = models.DateField(null=True, blank=True)
    tiklop_shift = models.CharField(max_length=50, blank=True, default='')
    tiklop_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 9. Returned
    date_returned = models.DateField(null=True, blank=True)
    returned_by = models.CharField(max_length=150, blank=True, default='')

    # 10. Encoded By
    encoded_by = models.CharField(max_length=150)

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.FOR_LABA)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-laundry_in_date', '-id']

    def calculate_status(self):
        if self.date_returned and self.returned_by:
            return self.Status.RETURNED
        if self.tiklop_date:
            return self.Status.READY_FOR_RETURN
        if self.pinaw_date:
            return self.Status.FOR_TIKLOP
        if self.sampay_date:
            return self.Status.FOR_PINAW
        if self.banlaw_date:
            return self.Status.FOR_SAMPAY
        if self.laba_date:
            return self.Status.FOR_BANLAW
        return self.Status.FOR_LABA

    def save(self, *args, **kwargs):
        # Auto-update status if not manually set to in-stage
        computed = self.calculate_status()
        self.status = computed
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Laundry #{self.id}: {self.item} (Qty: {self.quantity}) - {self.get_status_display()}"
