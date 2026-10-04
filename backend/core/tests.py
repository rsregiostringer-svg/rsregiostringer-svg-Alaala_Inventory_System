from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, Location, AuditLog


class AuthAndPermissionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.location = Location.objects.create(name='C2', code='C2')
        self.master_admin = User.objects.create_user(
            username='master_user', email='master@test.com', password='Password123!',
            role=User.Role.MASTER_ADMIN
        )
        self.staff_user = User.objects.create_user(
            username='staff_user', email='staff@test.com', password='Password123!',
            role=User.Role.STAFF, location=self.location
        )

    def test_login_success(self):
        url = reverse('auth-login')
        response = self.client.post(url, {'username': 'master_user', 'password': 'Password123!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'MASTER_ADMIN')

    def test_login_invalid_credentials(self):
        url = reverse('auth-login')
        response = self.client.post(url, {'username': 'master_user', 'password': 'WrongPassword'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_cannot_create_users(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('users-list')
        response = self.client.post(url, {
            'username': 'new_user', 'password': 'Password123!', 'role': 'STAFF'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_master_admin_can_create_users(self):
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('users-list')
        response = self.client.post(url, {
            'username': 'new_staff', 'password': 'Password123!', 'role': 'STAFF'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dashboard_stats_authenticated(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('dashboard-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('kpis', response.data)
        self.assertIn('inventory_by_location', response.data)
