import datetime
from django.test import TestCase
from core.models import Location, User
from laundry.models import LaundryRecord


class LaundryWorkflowTests(TestCase):
    def setUp(self):
        self.loc = Location.objects.create(name='SERVICES', code='SERVICES')
        self.today = datetime.date.today()

    def test_laundry_workflow_and_status_calculation(self):
        # 1. Intake
        record = LaundryRecord.objects.create(
            location=self.loc,
            item='Chapel Curtains',
            quantity=10,
            laundry_in_date=self.today,
            laundry_in_shift='Morning',
            laundry_in_charge='Juan',
            encoded_by='Admin'
        )
        self.assertEqual(record.status, LaundryRecord.Status.FOR_LABA)

        # 2. Laba
        record.laba_date = self.today
        record.laba_shift = 'Morning'
        record.laba_in_charge = 'Pedro'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_BANLAW)

        # 3. Banlaw
        record.banlaw_date = self.today
        record.banlaw_shift = 'Afternoon'
        record.banlaw_in_charge = 'Pedro'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_SAMPAY)

        # 4. Sampay
        record.sampay_date = self.today
        record.sampay_shift = 'Afternoon'
        record.sampay_in_charge = 'Maria'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_PINAW)

        # 5. Pinaw
        record.pinaw_date = self.today
        record.pinaw_shift = 'Morning'
        record.pinaw_in_charge = 'Elena'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_TIKLOP)

        # 6. Tiklop
        record.tiklop_date = self.today
        record.tiklop_shift = 'Morning'
        record.tiklop_in_charge = 'Elena'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.READY_FOR_RETURN)

        # 7. Returned
        record.date_returned = self.today
        record.returned_by = 'Juan'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.RETURNED)
