import datetime
from decimal import Decimal
from django.test import TestCase
from core.models import Location, User
from caskets.models import Casket, CasketTransaction


class CasketTests(TestCase):
    def setUp(self):
        self.loc = Location.objects.create(name='SERVICES', code='SERVICES')
        self.user = User.objects.create_user(username='admin_cask', password='Password123!', role=User.Role.ADMIN)

    def test_casket_creation_and_reservation(self):
        casket = Casket.objects.create(
            casket_id='CSK-999',
            model='Presidential Solid Oak',
            casket_type='Wood',
            size='Standard Adult',
            color='Mahogany',
            material='Solid Oak',
            purchase_cost=Decimal('40000.00'),
            selling_price=Decimal('75000.00'),
            quantity=1,
            location=self.loc,
            condition=Casket.Condition.NEW,
            status=Casket.Status.AVAILABLE,
            date_received=datetime.date.today()
        )
        self.assertEqual(casket.status, Casket.Status.AVAILABLE)

        # Transition to RESERVED
        casket.status = Casket.Status.RESERVED
        casket.save()
        CasketTransaction.objects.create(
            casket=casket,
            action=CasketTransaction.Action.RESERVE,
            user=self.user,
            previous_status=Casket.Status.AVAILABLE,
            new_status=Casket.Status.RESERVED,
            deceased_name='Test Client'
        )

        self.assertEqual(casket.history.count(), 1)
        self.assertEqual(casket.history.first().deceased_name, 'Test Client')
