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
        # Legacy meter test (subsequent > initial)
        bill = WaterBill.objects.create(
            location=self.loc,
            tank='MTR-001',
            initial_level=Decimal('100.00'),
            subsequent_level=Decimal('145.50'),
            billing_period='October 2026',
            date=self.today,
            due_date=self.today + datetime.timedelta(days=15),
            amount=Decimal('2500.00'),
            payment_status=PaymentStatus.UNPAID
        )
        
        # New Tank Monitoring Test
        tank_bill = WaterBill.objects.create(
            location=self.loc,
            tank='TANK-01',
            initial_level=Decimal('700.00'),
            initial_additional=Decimal('100.00'),
            subsequent_level=Decimal('500.00'),
            subsequent_additional=Decimal('0.00'),
            date=self.today
        )
        
        # 700 + 100 - 500 - 0 = 300
        self.assertEqual(tank_bill.consumption, Decimal('300.00'))

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
