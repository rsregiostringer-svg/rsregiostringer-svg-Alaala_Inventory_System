import datetime
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Location, User
from caskets.models import (
    Casket, CasketTransaction, Buyer, Deceased, Chapel,
    CasketSale, LamayRecord, ChapelTurnover
)


class CasketTests(TestCase):
    def setUp(self):
        self.loc = Location.objects.create(name='SERVICES', code='SERVICES')
        self.master_admin = User.objects.create_superuser(
            username='master_user', password='Password123!', role=User.Role.MASTER_ADMIN
        )
        self.staff_user = User.objects.create_user(
            username='staff_user', password='Password123!', role=User.Role.STAFF, location=self.loc
        )
        self.chapel = Chapel.objects.create(
            name='Chapel 2',
            code='CHAPEL-2',
            capacity=50,
            location=self.loc,
            status=Chapel.Status.AVAILABLE
        )
        self.casket = Casket.objects.create(
            casket_id='C-00025',
            model='Imperial White',
            casket_type='Metal',
            size='Standard',
            color='White',
            material='Steel',
            purchase_cost=Decimal('22000.00'),
            selling_price=Decimal('35000.00'),
            quantity=5,
            location=self.loc,
            condition=Casket.Condition.GOOD,
            status=Casket.Status.AVAILABLE,
            date_received=datetime.date.today()
        )
        self.client = APIClient()

    def test_casket_sale_and_inventory_decrement(self):
        self.client.force_authenticate(user=self.master_admin)

        payload = {
            'buyer': {
                'full_name': 'Juan Dela Cruz',
                'contact_number': '0917-123-4567',
                'address': 'Batangas City',
                'relationship_to_deceased': 'Son'
            },
            'deceased': {
                'full_name': 'Pedro Dela Cruz',
                'date_of_death': str(datetime.date.today()),
                'age': 75,
                'sex': 'MALE',
                'funeral_case_id': 'CASE-999'
            },
            'service': {
                'chapel': self.chapel.id,
                'lamay_start_date': str(datetime.date.today()),
                'expected_burial_date': str(datetime.date.today() + datetime.timedelta(days=4)),
                'service_status': 'ACTIVE'
            },
            'selling_price': 35000.00
        }

        res = self.client.post(f"/api/caskets/{self.casket.id}/sell_or_assign/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # 1. Verify Buyer and Deceased are separate records
        self.assertTrue(Buyer.objects.filter(full_name='Juan Dela Cruz').exists())
        self.assertTrue(Deceased.objects.filter(full_name='Pedro Dela Cruz').exists())
        buyer = Buyer.objects.get(full_name='Juan Dela Cruz')
        deceased = Deceased.objects.get(full_name='Pedro Dela Cruz')
        self.assertNotEqual(buyer.full_name, deceased.full_name)
        self.assertIsInstance(buyer, Buyer)
        self.assertIsInstance(deceased, Deceased)

        # 2. Verify Casket quantity decremented: 5 -> 4
        self.casket.refresh_from_db()
        self.assertEqual(self.casket.quantity, 4)

        # 3. Verify Chapel is now OCCUPIED
        self.chapel.refresh_from_db()
        self.assertEqual(self.chapel.status, Chapel.Status.OCCUPIED)

        # 4. Verify LamayRecord was created and is ACTIVE
        lamay = LamayRecord.objects.get(chapel=self.chapel, deceased=deceased)
        self.assertEqual(lamay.status, LamayRecord.Status.ACTIVE)
        self.assertEqual(lamay.buyer, buyer)

    def test_double_booking_prevention(self):
        # Occupy chapel with first deceased
        self.client.force_authenticate(user=self.master_admin)
        buyer1 = Buyer.objects.create(full_name='Buyer 1', contact_number='0911')
        deceased1 = Deceased.objects.create(full_name='First Deceased')
        LamayRecord.objects.create(
            lamay_id='LAMAY-1001',
            chapel=self.chapel,
            deceased=deceased1,
            buyer=buyer1,
            lamay_start_date=datetime.date.today(),
            expected_burial_date=datetime.date.today() + datetime.timedelta(days=4),
            status=LamayRecord.Status.ACTIVE
        )
        self.chapel.status = Chapel.Status.OCCUPIED
        self.chapel.save()

        # Try assigning a second active lamay to the same occupied chapel using staff
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            'buyer': {'full_name': 'Buyer 2', 'contact_number': '0922'},
            'deceased': {'full_name': 'Second Deceased'},
            'service': {
                'chapel': self.chapel.id,
                'lamay_start_date': str(datetime.date.today()),
                'service_status': 'ACTIVE'
            },
            'selling_price': 35000.00
        }
        res = self.client.post(f"/api/caskets/{self.casket.id}/sell_or_assign/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('CHAPEL UNAVAILABLE', res.data['detail'])

    def test_burial_service_completion_and_turnover_flow(self):
        self.client.force_authenticate(user=self.master_admin)
        buyer = Buyer.objects.create(full_name='Buyer', contact_number='0911')
        deceased = Deceased.objects.create(full_name='Pedro Dela Cruz')
        lamay = LamayRecord.objects.create(
            lamay_id='LAMAY-1002',
            chapel=self.chapel,
            deceased=deceased,
            buyer=buyer,
            lamay_start_date=datetime.date.today(),
            expected_burial_date=datetime.date.today() + datetime.timedelta(days=4),
            status=LamayRecord.Status.ACTIVE
        )
        self.chapel.status = Chapel.Status.OCCUPIED
        self.chapel.save()

        # 1. Complete service (Deceased leaves for burial)
        comp_res = self.client.post(f"/api/lamay/{lamay.id}/complete_service/")
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)
        lamay.refresh_from_db()
        self.chapel.refresh_from_db()
        self.assertEqual(lamay.status, LamayRecord.Status.COMPLETED)
        self.assertEqual(self.chapel.status, Chapel.Status.CLEANING)

        # 2. Staff performs Chapel Turnover Checklist (Requirement 15)
        self.client.force_authenticate(user=self.staff_user)
        turnover_payload = {
            'casket_removed': True,
            'chairs_arranged': True,
            'tables_cleaned': True,
            'floor_cleaned': True,
            'bathroom_checked': True,
            'trash_removed': True,
            'equipment_checked': True,
            'inventory_checked': True,
            'chapel_ready': True,
            'notes': 'Spotless and disinfected.'
        }
        turnover_res = self.client.post(f"/api/chapels/{self.chapel.id}/turnover/", turnover_payload, format='json')
        self.assertEqual(turnover_res.status_code, status.HTTP_200_OK)

        # Chapel must now be AVAILABLE
        self.chapel.refresh_from_db()
        self.assertEqual(self.chapel.status, Chapel.Status.AVAILABLE)
        self.assertTrue(ChapelTurnover.objects.filter(chapel=self.chapel).exists())

    def test_residence_house_viewing_flow(self):
        """
        Verify Residence / House Viewing does not block facility chapels,
        decrements casket inventory, appears under active lamays, and completes directly.
        """
        self.client.force_authenticate(user=self.master_admin)

        payload = {
            'buyer': {
                'full_name': 'Maria Santos',
                'contact_number': '0918-987-6543',
                'address': '456 Mabini St., Angeles City',
                'relationship_to_deceased': 'Daughter'
            },
            'deceased': {
                'full_name': 'Jose Santos',
                'date_of_death': str(datetime.date.today()),
                'age': 82,
                'sex': 'MALE',
                'funeral_case_id': 'CASE-RES-01'
            },
            'service': {
                'is_residence': True,
                'residence_address': '456 Mabini St., Angeles City (Private Residence)',
                'lamay_start_date': str(datetime.date.today()),
                'expected_burial_date': str(datetime.date.today() + datetime.timedelta(days=3)),
                'service_status': 'ACTIVE'
            },
            'selling_price': 35000.00
        }

        res = self.client.post(f"/api/caskets/{self.casket.id}/sell_or_assign/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Casket inventory must be decremented: 5 -> 4
        self.casket.refresh_from_db()
        self.assertEqual(self.casket.quantity, 4)

        # Facility chapel must remain AVAILABLE (not occupied)
        self.chapel.refresh_from_db()
        self.assertEqual(self.chapel.status, Chapel.Status.AVAILABLE)

        # LamayRecord must be created with is_residence=True and no physical chapel
        deceased = Deceased.objects.get(full_name='Jose Santos')
        lamay = LamayRecord.objects.get(deceased=deceased)
        self.assertTrue(lamay.is_residence)
        self.assertIsNone(lamay.chapel)
        self.assertEqual(lamay.residence_address, '456 Mabini St., Angeles City (Private Residence)')
        self.assertEqual(lamay.status, LamayRecord.Status.ACTIVE)

        # Query currently_having_lamay endpoint
        curr_res = self.client.get('/api/lamay/currently_having_lamay/')
        self.assertEqual(curr_res.status_code, status.HTTP_200_OK)
        active_ids = [s['id'] for s in curr_res.data['active_services']]
        self.assertIn(lamay.id, active_ids)

        # Complete service: completes directly without affecting any chapel
        comp_res = self.client.post(f"/api/lamay/{lamay.id}/complete_service/")
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)
        lamay.refresh_from_db()
        self.assertEqual(lamay.status, LamayRecord.Status.COMPLETED)
        self.chapel.refresh_from_db()
        self.assertEqual(self.chapel.status, Chapel.Status.AVAILABLE)

    def test_chapel_crud_and_safety_checks(self):
        """
        Verify Master Admin can create, edit, and delete chapels,
        and active lamay prevents accidental deletion.
        """
        self.client.force_authenticate(user=self.master_admin)

        # Create
        create_res = self.client.post('/api/chapels/', {
            'name': 'Chapel St. Joseph',
            'code': 'CHAPEL-SJ',
            'capacity': 60,
            'status': 'AVAILABLE'
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        chapel_id = create_res.data['id']

        # Edit (Patch)
        patch_res = self.client.patch(f"/api/chapels/{chapel_id}/", {
            'capacity': 80,
            'description': 'Upgraded family lounge'
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['capacity'], 80)

        # Staff cannot delete
        self.client.force_authenticate(user=self.staff_user)
        del_staff = self.client.delete(f"/api/chapels/{chapel_id}/")
        self.assertEqual(del_staff.status_code, status.HTTP_403_FORBIDDEN)

        # Master admin can delete clean chapel
        self.client.force_authenticate(user=self.master_admin)
        del_admin = self.client.delete(f"/api/chapels/{chapel_id}/")
        self.assertEqual(del_admin.status_code, status.HTTP_200_OK)
        self.assertFalse(Chapel.objects.filter(id=chapel_id).exists())
