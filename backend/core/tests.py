from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, Location, AuditLog, SystemSetting
from inventory.models import Category, InventoryItem
from laundry.models import LaundryRecord
from utilities.models import WaterBill, ElectricityBill


class RoleBasedAccessControlTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create two distinct locations
        self.loc_c2 = Location.objects.create(name='C2 Chapel', code='C2')
        self.loc_c3 = Location.objects.create(name='C3 Chapel', code='C3')
        self.loc_office = Location.objects.create(name='OFFICE', code='OFFICE')

        # 1. Master Admin (Full Unrestricted Access)
        self.master_admin = User.objects.create_user(
            username='master_boss',
            first_name='Master',
            last_name='Admin',
            email='master@alaala.ph',
            password='MasterPassword123!',
            role=User.Role.MASTER_ADMIN,
            status=User.Status.ACTIVE
        )

        # 2. Simple Admin (Assigned to C2 only)
        self.simple_admin = User.objects.create_user(
            username='simple_admin',
            first_name='Simple',
            last_name='Admin',
            email='simple@alaala.ph',
            password='AdminPassword123!',
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE
        )
        self.simple_admin.assigned_locations.add(self.loc_c2)

        # 3. Staff (Assigned to C2 only, without water/electricity/reports perms)
        self.staff_user = User.objects.create_user(
            username='staff_worker',
            first_name='Staff',
            last_name='Worker',
            email='staff@alaala.ph',
            password='StaffPassword123!',
            role=User.Role.STAFF,
            status=User.Status.ACTIVE
        )
        self.staff_user.assigned_locations.add(self.loc_c2)

        # Create test items in C2 and C3
        self.category = Category.objects.create(name='Supplies')
        self.item_c2 = InventoryItem.objects.create(
            item_name='Candles C2',
            category=self.category,
            location=self.loc_c2,
            current_quantity=50,
            minimum_stock=10,
            cost=25.00
        )
        self.item_c3 = InventoryItem.objects.create(
            item_name='Candles C3',
            category=self.category,
            location=self.loc_c3,
            current_quantity=100,
            minimum_stock=20,
            cost=25.00
        )

    # ============================================================
    # MASTER ADMIN TESTS
    # ============================================================

    def test_master_admin_can_access_all_modules(self):
        """Master Admin has full access to users, audit logs, reports, analytics, settings."""
        self.client.force_authenticate(user=self.master_admin)

        # Users API
        res_users = self.client.get(reverse('users-list'))
        self.assertEqual(res_users.status_code, status.HTTP_200_OK)

        # Audit Logs API
        res_audit = self.client.get(reverse('audit-logs-list'))
        self.assertEqual(res_audit.status_code, status.HTTP_200_OK)

        # Reports API
        res_reports = self.client.get(reverse('reports-summary'))
        self.assertEqual(res_reports.status_code, status.HTTP_200_OK)

        # Analytics API
        res_analytics = self.client.get(reverse('analytics-stats'))
        self.assertEqual(res_analytics.status_code, status.HTTP_200_OK)

        # Settings API
        res_settings = self.client.get(reverse('system-settings'))
        self.assertEqual(res_settings.status_code, status.HTTP_200_OK)

    def test_master_admin_can_see_all_locations_inventory(self):
        """Master Admin sees items from C2 and C3 without restrictions."""
        self.client.force_authenticate(user=self.master_admin)
        res = self.client.get(reverse('inventory-items-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item_ids = [item['id'] for item in (res.data.get('results') or res.data)]
        self.assertIn(self.item_c2.id, item_ids)
        self.assertIn(self.item_c3.id, item_ids)

    def test_master_admin_can_edit_himself(self):
        """Master Admin can edit his own profile without lockout."""
        self.client.force_authenticate(user=self.master_admin)
        res = self.client.put(reverse('auth-profile'), {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
            'username': 'master_boss',
            'email': 'updated@alaala.ph'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.master_admin.refresh_from_db()
        self.assertEqual(self.master_admin.first_name, 'UpdatedFirst')
        self.assertEqual(self.master_admin.last_name, 'UpdatedLast')

    def test_master_admin_cannot_delete_last_active_master_admin(self):
        """Safety check: Deleting the only active Master Admin must be rejected."""
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('users-detail', kwargs={'pk': self.master_admin.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('last active Master Admin', str(res.data))

    def test_master_admin_cannot_demote_last_active_master_admin(self):
        """Safety check: Demoting the only active Master Admin must be rejected."""
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('users-detail', kwargs={'pk': self.master_admin.id})
        res = self.client.patch(url, {'role': 'STAFF', 'first_name': 'M', 'last_name': 'A'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('last active Master Admin', str(res.data))

    # ============================================================
    # SIMPLE ADMIN RESTRICTIONS
    # ============================================================

    def test_simple_admin_cannot_access_users(self):
        """Simple Admin must receive 403 Forbidden when requesting /api/users/."""
        self.client.force_authenticate(user=self.simple_admin)
        res = self.client.get(reverse('users-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_admin_cannot_access_audit_logs(self):
        """Simple Admin must receive 403 Forbidden when requesting /api/audit-logs/."""
        self.client.force_authenticate(user=self.simple_admin)
        res = self.client.get(reverse('audit-logs-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_admin_cannot_access_reports_without_perm(self):
        """Simple Admin without reports permission must receive 403 Forbidden."""
        self.client.force_authenticate(user=self.simple_admin)
        res = self.client.get(reverse('reports-summary'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_admin_cannot_access_analytics(self):
        """Simple Admin must receive 403 Forbidden when requesting /api/analytics/."""
        self.client.force_authenticate(user=self.simple_admin)
        res = self.client.get(reverse('analytics-stats'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_admin_cannot_access_settings(self):
        """Simple Admin must receive 403 Forbidden when requesting /api/settings/."""
        self.client.force_authenticate(user=self.simple_admin)
        res = self.client.get(reverse('system-settings'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_simple_admin_location_isolation(self):
        """Simple Admin assigned to C2 must NOT see records from C3."""
        self.client.force_authenticate(user=self.simple_admin)
        res = self.client.get(reverse('inventory-items-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data.get('results') or res.data
        item_ids = [item['id'] for item in items]
        self.assertIn(self.item_c2.id, item_ids)
        self.assertNotIn(self.item_c3.id, item_ids)

    # ============================================================
    # STAFF RESTRICTIONS
    # ============================================================

    def test_staff_cannot_access_users(self):
        """Staff must receive 403 Forbidden when requesting /api/users/."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('users-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_audit_logs(self):
        """Staff must receive 403 Forbidden when requesting /api/audit-logs/."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('audit-logs-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_reports(self):
        """Staff must receive 403 Forbidden when requesting /api/reports/summary/."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('reports-summary'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_analytics(self):
        """Staff must receive 403 Forbidden when requesting /api/analytics/."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('analytics-stats'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_settings(self):
        """Staff must receive 403 Forbidden when requesting /api/settings/."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('system-settings'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_water_without_custom_perm(self):
        """Staff without water custom perm must receive 403 Forbidden."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('water-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_access_water_with_custom_perm(self):
        """Staff WITH water custom perm can access water list."""
        self.staff_user.custom_permissions = {'water': True}
        self.staff_user.save()
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('water-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_staff_location_isolation(self):
        """Staff assigned to C2 must NOT see C3 items."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get(reverse('inventory-items-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data.get('results') or res.data
        item_ids = [item['id'] for item in items]
        self.assertIn(self.item_c2.id, item_ids)
        self.assertNotIn(self.item_c3.id, item_ids)
