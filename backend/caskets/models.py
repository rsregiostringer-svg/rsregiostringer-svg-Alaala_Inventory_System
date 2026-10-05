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


RELATIONSHIP_CHOICES = [
    ('Father', 'Father'),
    ('Mother', 'Mother'),
    ('Son', 'Son'),
    ('Daughter', 'Daughter'),
    ('Spouse', 'Spouse'),
    ('Husband', 'Husband'),
    ('Wife', 'Wife'),
    ('Brother', 'Brother'),
    ('Sister', 'Sister'),
    ('Grandfather', 'Grandfather'),
    ('Grandmother', 'Grandmother'),
    ('Grandson', 'Grandson'),
    ('Granddaughter', 'Granddaughter'),
    ('Uncle', 'Uncle'),
    ('Aunt', 'Aunt'),
    ('Cousin', 'Cousin'),
    ('Nephew', 'Nephew'),
    ('Niece', 'Niece'),
    ('Partner', 'Partner'),
    ('Friend', 'Friend'),
    ('Relative', 'Relative'),
    ('Guardian', 'Guardian'),
    ('Other', 'Other'),
]


class Buyer(models.Model):
    """
    Casket Buyer / Client - strictly separate from deceased.
    Stores Philippine 11-digit mobile number (09XXXXXXXXX).
    """
    # Structured name fields
    first_name = models.CharField(max_length=100, blank=True, default='')
    middle_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    # Computed full_name kept for backward compatibility
    full_name = models.CharField(max_length=300, blank=True, default='')

    contact_number = models.CharField(max_length=11)  # Exactly 11 digits: 09XXXXXXXXX
    address = models.TextField(blank=True, default='')
    relationship_to_deceased = models.CharField(max_length=100, blank=True, default='')
    relationship_other = models.CharField(max_length=200, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def save(self, *args, **kwargs):
        # Auto-compute full_name from parts
        parts = [self.first_name, self.middle_name, self.last_name]
        self.full_name = ' '.join(p for p in parts if p).strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.contact_number})"


class Deceased(models.Model):
    """
    Deceased person information - strictly separate from buyer/client.
    """
    class Sex(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    # Structured name fields
    first_name = models.CharField(max_length=100, blank=True, default='')
    middle_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    suffix = models.CharField(max_length=20, blank=True, default='')
    # Computed full_name for backward compat
    full_name = models.CharField(max_length=300, blank=True, default='')

    date_of_birth = models.DateField(null=True, blank=True)
    date_of_death = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    sex = models.CharField(max_length=20, choices=Sex.choices, blank=True, default='')
    address = models.TextField(blank=True, default='')
    cause_of_death = models.CharField(max_length=300, blank=True, default='')
    funeral_case_id = models.CharField(max_length=100, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        parts = [self.first_name, self.middle_name, self.last_name]
        computed = ' '.join(p for p in parts if p).strip()
        if self.suffix:
            computed = f"{computed} {self.suffix}"
        self.full_name = computed
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} (Case: {self.funeral_case_id or 'N/A'})"


class Chapel(models.Model):
    """
    Chapels for wake / lamay services. Dynamic and configurable by Master Admin.
    """
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        OCCUPIED = 'OCCUPIED', 'Occupied / Lamay'
        RESERVED = 'RESERVED', 'Reserved'
        CLEANING = 'CLEANING', 'Cleaning'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'Out of Service'

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    capacity = models.IntegerField(default=50)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.AVAILABLE)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='chapel_units')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.get_status_display()}]"

    def get_active_lamay(self):
        """Returns currently active lamay record if any."""
        return self.lamay_records.filter(status=LamayRecord.Status.ACTIVE).first()

    def get_upcoming_reservations(self):
        """Returns upcoming reserved lamay records."""
        return self.lamay_records.filter(status=LamayRecord.Status.RESERVED).order_by('lamay_start_date')


class CasketSale(models.Model):
    """
    Casket Sale / Usage Record linking Casket, Buyer, Deceased, and Chapel.
    """
    sale_id = models.CharField(max_length=50, unique=True)
    casket = models.ForeignKey(Casket, on_delete=models.PROTECT, related_name='sales')
    buyer = models.ForeignKey(Buyer, on_delete=models.PROTECT, related_name='casket_sales')
    deceased = models.ForeignKey(Deceased, on_delete=models.PROTECT, related_name='casket_sales')
    chapel = models.ForeignKey(Chapel, on_delete=models.SET_NULL, null=True, blank=True, related_name='casket_sales')
    is_residence = models.BooleanField(default=False)
    residence_address = models.TextField(blank=True, default='')
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    lamay_start_date = models.DateField(null=True, blank=True)
    lamay_start_time = models.TimeField(null=True, blank=True)
    expected_burial_date = models.DateField(null=True, blank=True)
    burial_time = models.TimeField(null=True, blank=True)
    service_status = models.CharField(max_length=50, default='ACTIVE_LAMAY')
    notes = models.TextField(blank=True, default='')
    encoded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='encoded_sales')
    date_sold = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_sold']

    def __str__(self):
        venue = self.chapel.name if self.chapel else (f"Residence: {self.residence_address}" if self.residence_address else 'Residence')
        return f"{self.sale_id}: {self.casket.model} sold to {self.buyer.full_name} for {self.deceased.full_name} [{venue}]"


class LamayRecord(models.Model):
    """
    Lamay / Wake Record for Chapel Monitoring.
    """
    class Status(models.TextChoices):
        ARRANGEMENT = 'ARRANGEMENT', 'Arrangement'
        RESERVED = 'RESERVED', 'Reserved'
        PREPARING = 'PREPARING', 'Preparing'
        ACTIVE = 'ACTIVE', 'Active Wake'
        READY_FOR_BURIAL = 'READY_FOR_BURIAL', 'Ready for Burial'
        FOR_BURIAL = 'FOR_BURIAL', 'For Burial'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class WakeLocation(models.TextChoices):
        ALAALA = 'ALAALA', 'Alaala Funeral Homes'
        RESIDENCE = 'RESIDENCE', 'Client Residence'
        CHURCH = 'CHURCH', 'Church'
        CEMETERY = 'CEMETERY', 'Cemetery'
        OTHER = 'OTHER', 'Other'

    lamay_id = models.CharField(max_length=50, unique=True)
    chapel = models.ForeignKey(Chapel, on_delete=models.SET_NULL, null=True, blank=True, related_name='lamay_records')
    wake_location = models.CharField(max_length=20, choices=WakeLocation.choices, default=WakeLocation.ALAALA)
    is_residence = models.BooleanField(default=False)
    residence_address = models.TextField(blank=True, default='')
    deceased = models.ForeignKey(Deceased, on_delete=models.PROTECT, related_name='lamay_records')
    buyer = models.ForeignKey(Buyer, on_delete=models.PROTECT, related_name='lamay_records')  # Family Contact
    casket = models.ForeignKey(Casket, on_delete=models.SET_NULL, null=True, blank=True, related_name='lamay_records')
    casket_sale = models.ForeignKey(CasketSale, on_delete=models.SET_NULL, null=True, blank=True, related_name='lamay_records')
    funeral_case_id = models.CharField(max_length=100, blank=True, default='')
    lamay_start_date = models.DateField()
    lamay_start_time = models.TimeField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    expected_burial_date = models.DateField(null=True, blank=True)
    burial_time = models.TimeField(null=True, blank=True)
    assigned_staff = models.CharField(max_length=300, blank=True, default='')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True, default='')
    encoded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='encoded_lamays')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-lamay_start_date', '-created_at']

    def __str__(self):
        venue = self.chapel.name if self.chapel else (f"Residence: {self.residence_address}" if self.residence_address else 'Residence / Home Viewing')
        return f"{self.lamay_id} - {venue} ({self.deceased.full_name}) [{self.get_status_display()}]"


class ChapelTurnover(models.Model):
    """
    Chapel turnover and cleaning inspection record required before a chapel returns to AVAILABLE.
    """
    chapel = models.ForeignKey(Chapel, on_delete=models.CASCADE, related_name='turnovers')
    lamay_record = models.ForeignKey(LamayRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name='turnovers')
    deceased_name = models.CharField(max_length=200, blank=True, default='')
    
    # 9 Turnover Checklist Items
    casket_removed = models.BooleanField(default=False)
    chairs_arranged = models.BooleanField(default=False)
    tables_cleaned = models.BooleanField(default=False)
    floor_cleaned = models.BooleanField(default=False)
    bathroom_checked = models.BooleanField(default=False)
    trash_removed = models.BooleanField(default=False)
    equipment_checked = models.BooleanField(default=False)
    inventory_checked = models.BooleanField(default=False)
    chapel_ready = models.BooleanField(default=False)

    notes = models.TextField(blank=True, default='')
    checked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_turnovers')
    checked_by_name = models.CharField(max_length=150, blank=True, default='')
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-completed_at']

    def __str__(self):
        return f"Turnover for {self.chapel.name} on {self.completed_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def is_all_checked(self):
        return all([
            self.casket_removed,
            self.chairs_arranged,
            self.tables_cleaned,
            self.floor_cleaned,
            self.bathroom_checked,
            self.trash_removed,
            self.equipment_checked,
            self.inventory_checked,
            self.chapel_ready,
        ])
