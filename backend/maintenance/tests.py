import datetime
from decimal import Decimal
from django.test import TestCase
from core.models import Location
from maintenance.models import Maintenance


class MaintenanceTests(TestCase):
    def setUp(self):
        self.loc = Location.objects.create(name='C3', code='C3')

    def test_maintenance_ticket_lifecycle(self):
        maint = Maintenance.objects.create(
            maintenance_id='MNT-TEST-001',
            location=self.loc,
            category=Maintenance.Category.AIR_CONDITIONING,
            issue='AC fan noise',
            description='Bearing noise in Chapel 3 unit',
            priority=Maintenance.Priority.HIGH,
            reported_by='Juan Dela Cruz',
            date_reported=datetime.date.today(),
            status=Maintenance.Status.REPORTED,
            cost=Decimal('1500.00')
        )
        self.assertEqual(maint.status, Maintenance.Status.REPORTED)
        self.assertEqual(maint.priority, Maintenance.Priority.HIGH)

        # Update to COMPLETED
        maint.status = Maintenance.Status.COMPLETED
        maint.date_completed = datetime.date.today()
        maint.save()

        self.assertEqual(maint.status, Maintenance.Status.COMPLETED)
