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
            laundry_in_time='09:00 AM',
            laundry_in_shift='8am to 5pm',
            laundry_in_charge='Juan',
            encoded_by='Admin'
        )
        self.assertEqual(record.status, LaundryRecord.Status.FOR_LABA)

        # 2. Laba
        record.laba_date = self.today
        record.laba_time = '10:30 AM'
        record.laba_shift = '8am to 5pm'
        record.laba_in_charge = 'Pedro'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_BANLAW)

        # 3. Banlaw
        record.banlaw_date = self.today
        record.banlaw_time = '04:15 PM'
        record.banlaw_shift = '4pm to 1am'
        record.banlaw_in_charge = 'Pedro'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_SAMPAY)

        # 4. Sampay
        record.sampay_date = self.today
        record.sampay_time = '05:00 PM'
        record.sampay_shift = '4pm to 1am'
        record.sampay_in_charge = 'Maria'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_PINAW)

        # 5. Pinaw
        record.pinaw_date = self.today
        record.pinaw_time = '01:00 AM'
        record.pinaw_shift = '12midnight to 9am'
        record.pinaw_in_charge = 'Elena'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.FOR_TIKLOP)

        # 6. Tiklop
        record.tiklop_date = self.today
        record.tiklop_time = '08:30 AM'
        record.tiklop_shift = '8am to 5pm'
        record.tiklop_in_charge = 'Elena'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.READY_FOR_RETURN)

        # 7. Returned
        record.date_returned = self.today
        record.returned_time = '02:00 PM'
        record.returned_by = 'Juan'
        record.save()
        self.assertEqual(record.status, LaundryRecord.Status.RETURNED)
