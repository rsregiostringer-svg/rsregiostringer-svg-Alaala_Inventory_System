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

    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='laundry_records', null=True, blank=True)
    # Legacy fields, kept temporarily for data migration / compatibility
    item = models.CharField(max_length=200, blank=True, null=True, default='', help_text="DEPRECATED: Use LaundryRecordItem instead.")
    quantity = models.IntegerField(default=0, null=True, blank=True, help_text="DEPRECATED: Use LaundryRecordItem instead.")
    
    total_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # 1. Laundry IN
    laundry_in_date = models.DateField()
    laundry_in_time = models.CharField(max_length=30, blank=True, default='')  # e.g. 9:00am or 09:00
    laundry_in_shift = models.CharField(max_length=50)  # 8am to 5pm, 4pm to 1am, 12midnight to 9am
    laundry_in_charge = models.CharField(max_length=150)

    # 4. Laba (Washing)
    laba_date = models.DateField(null=True, blank=True)
    laba_time = models.CharField(max_length=30, blank=True, default='')
    laba_shift = models.CharField(max_length=50, blank=True, default='')
    laba_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 5. Banlaw (Rinsing)
    banlaw_date = models.DateField(null=True, blank=True)
    banlaw_time = models.CharField(max_length=30, blank=True, default='')
    banlaw_shift = models.CharField(max_length=50, blank=True, default='')
    banlaw_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 6. Sampay (Hanging)
    sampay_date = models.DateField(null=True, blank=True)
    sampay_time = models.CharField(max_length=30, blank=True, default='')
    sampay_shift = models.CharField(max_length=50, blank=True, default='')
    sampay_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 7. Pinaw (Ironing/Pressing)
    pinaw_date = models.DateField(null=True, blank=True)
    pinaw_time = models.CharField(max_length=30, blank=True, default='')
    pinaw_shift = models.CharField(max_length=50, blank=True, default='')
    pinaw_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 8. Tiklop (Folding)
    tiklop_date = models.DateField(null=True, blank=True)
    tiklop_time = models.CharField(max_length=30, blank=True, default='')
    tiklop_shift = models.CharField(max_length=50, blank=True, default='')
    tiklop_in_charge = models.CharField(max_length=150, blank=True, default='')

    # 9. Returned
    date_returned = models.DateField(null=True, blank=True)
    returned_time = models.CharField(max_length=30, blank=True, default='')
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
        items_count = self.items.count()
        if items_count > 0:
            first_item = self.items.first().item_description
            return f"Laundry #{self.id}: {first_item} (+{items_count-1} more) (Total Qty: {self.total_quantity}) - {self.get_status_display()}"
        return f"Laundry #{self.id} (Total Qty: {self.total_quantity}) - {self.get_status_display()}"

class LaundryRecordItem(models.Model):
    laundry_record = models.ForeignKey(LaundryRecord, on_delete=models.CASCADE, related_name='items')
    item_description = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit = models.CharField(max_length=50, blank=True, default='pcs')
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='laundry_items', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.item_description} - {self.quantity} {self.unit}"
