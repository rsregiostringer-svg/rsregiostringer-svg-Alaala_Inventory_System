import datetime
from decimal import Decimal
from django.test import TestCase
from core.models import Location
from utilities.models import WaterBill, ElectricityBill, PaymentStatus


class UtilitiesTests(TestCase):
    def setUp(self):
        self.loc = Location.objects.create(name='OFFICE', code='OFFICE')
        self.today = datetime.date.today()

    def test_water_bill_consumption_auto_calculation(self):
        bill = WaterBill.objects.create(
            location=self.loc,
            meter_number='MTR-001',
            previous_reading=Decimal('100.00'),
            current_reading=Decimal('145.50'),
            billing_period='October 2026',
            bill_date=self.today,
            due_date=self.today + datetime.timedelta(days=15),
            amount=Decimal('2500.00'),
            payment_status=PaymentStatus.UNPAID
        )
        # Expected consumption: 145.50 - 100.00 = 45.50
        self.assertEqual(bill.consumption, Decimal('45.50'))

    def test_electricity_bill_consumption_auto_calculation(self):
        bill = ElectricityBill.objects.create(
            location=self.loc,
            meter_number='MER-999',
            previous_reading=Decimal('1000.00'),
            current_reading=Decimal('1350.25'),
            billing_period='October 2026',
            bill_date=self.today,
            due_date=self.today + datetime.timedelta(days=15),
            amount=Decimal('8200.00'),
            payment_status=PaymentStatus.UNPAID
        )
        # Expected consumption: 1350.25 - 1000.00 = 350.25
        self.assertEqual(bill.consumption, Decimal('350.25'))
