from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Location, User
from inventory.models import Category, InventoryItem, InventoryTransaction
from inventory.services import execute_inventory_transaction


class InventoryLogicTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.loc_office = Location.objects.create(name='OFFICE', code='OFFICE')
        self.loc_c2 = Location.objects.create(name='C2', code='C2')
        self.category = Category.objects.create(name='Linens')
        self.admin = User.objects.create_user(username='admin_inv', password='Password123!', role=User.Role.ADMIN)

        self.item = InventoryItem.objects.create(
            item_name='Bath Towels',
            category=self.category,
            location=self.loc_office,
            current_quantity=20,
            minimum_stock=5,
            maximum_stock=50,
            cost=150.00
        )

    def test_stock_status_auto_calculation(self):
        # 20 items > 5 (min) -> AVAILABLE
        self.assertEqual(self.item.status, InventoryItem.Status.AVAILABLE)

        # 5 items == 5 (min) -> LOW_STOCK
        self.item.current_quantity = 5
        self.item.save()
        self.assertEqual(self.item.status, InventoryItem.Status.LOW_STOCK)

        # 0 items -> OUT_OF_STOCK
        self.item.current_quantity = 0
        self.item.save()
        self.assertEqual(self.item.status, InventoryItem.Status.OUT_OF_STOCK)

    def test_negative_stock_prevention(self):
        # Setting negative quantity should raise ValidationError
        self.item.current_quantity = -1
        with self.assertRaises(ValidationError):
            self.item.save()

    def test_insufficient_stock_transaction_raises_error(self):
        with self.assertRaises(ValidationError):
            execute_inventory_transaction(
                item=self.item,
                transaction_type=InventoryTransaction.TransactionType.STOCK_OUT,
                quantity=25,  # Exceeds 20
                user=self.admin,
                reason='Over-withdraw'
            )

    def test_inventory_transfer_updates_both_locations(self):
        # Initial: OFFICE has 20 Bath Towels, C2 has 0
        self.assertEqual(self.item.current_quantity, 20)
        self.assertFalse(InventoryItem.objects.filter(item_name='Bath Towels', location=self.loc_c2).exists())

        # Transfer 5 from OFFICE to C2
        tx = execute_inventory_transaction(
            item=self.item,
            transaction_type=InventoryTransaction.TransactionType.TRANSFER,
            quantity=5,
            user=self.admin,
            to_location=self.loc_c2,
            reason='Re-supply C2 chapel'
        )

        self.item.refresh_from_db()
        self.assertEqual(self.item.current_quantity, 15)  # 20 - 5 = 15

        c2_item = InventoryItem.objects.get(item_name='Bath Towels', location=self.loc_c2)
        self.assertEqual(c2_item.current_quantity, 5)

        # Transaction log recorded
        self.assertEqual(tx.transaction_type, InventoryTransaction.TransactionType.TRANSFER)
        self.assertEqual(tx.from_location, self.loc_office)
        self.assertEqual(tx.to_location, self.loc_c2)
        self.assertEqual(tx.quantity, 5)
