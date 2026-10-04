import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Location, AuditLog
from inventory.models import Category, InventoryItem, InventoryTransaction
from laundry.models import LaundryRecord
from caskets.models import Casket, CasketTransaction
from maintenance.models import Maintenance
from utilities.models import WaterBill, ElectricityBill

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds initial locations, categories, sample inventory, laundry, caskets, maintenance, and utility bills. Safe to run multiple times.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("--- Starting Initial Data Seeding for Alaala Funeral Homes ---"))

        # 1. Seed Locations
        initial_locations = [
            {'name': 'NO COE', 'code': 'NO_COE', 'description': 'No Certificate of Embalming storage & staging area'},
            {'name': 'SERVICES', 'code': 'SERVICES', 'description': 'Main preparation & services facility'},
            {'name': 'C2', 'code': 'C2', 'description': 'Chapel 2 (Air-conditioned viewing chapel)'},
            {'name': 'C3', 'code': 'C3', 'description': 'Chapel 3 (Viewing chapel)'},
            {'name': 'NC2', 'code': 'NC2', 'description': 'Non-AC Chapel 2'},
            {'name': 'NC3', 'code': 'NC3', 'description': 'Non-AC Chapel 3'},
            {'name': 'OFFICE', 'code': 'OFFICE', 'description': 'Administrative office & supply depot'},
        ]

        locations_map = {}
        for loc_data in initial_locations:
            loc, created = Location.objects.get_or_create(
                code=loc_data['code'],
                defaults={'name': loc_data['name'], 'description': loc_data['description'], 'is_active': True}
            )
            locations_map[loc.code] = loc
            locations_map[loc.name] = loc
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created location: {loc.name}"))

        # 2. Seed Default Staff & Admin Users for testing/demo
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@alaalafuneralhomes.com',
                'first_name': 'Admin',
                'last_name': 'Officer',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'location': locations_map.get('OFFICE')
            }
        )
        admin_user.set_password('Admin123!')
        admin_user.save()

        manager_user, _ = User.objects.get_or_create(
            username='manager',
            defaults={
                'email': 'manager@alaalafuneralhomes.com',
                'first_name': 'Operations',
                'last_name': 'Manager',
                'role': User.Role.MANAGER,
                'is_staff': False,
                'location': locations_map.get('SERVICES')
            }
        )
        manager_user.set_password('Manager123!')
        manager_user.save()

        staff_user, _ = User.objects.get_or_create(
            username='staff',
            defaults={
                'email': 'staff@alaalafuneralhomes.com',
                'first_name': 'Juan',
                'last_name': 'Dela Cruz',
                'role': User.Role.STAFF,
                'is_staff': False,
                'location': locations_map.get('C2')
            }
        )
        staff_user.set_password('Staff123!')
        staff_user.save()

        # 3. Seed Categories
        categories_data = [
            {'name': 'Linens & Drapery', 'description': 'Curtains, bedsheets, blankets, pillowcases, and barong covers'},
            {'name': 'Chapel Supplies', 'description': 'Candles, vigil stands, guestbooks, floral foam, and stands'},
            {'name': 'Embalming & Sanitation', 'description': 'Chemicals, sanitizers, gloves, face masks, and PPE'},
            {'name': 'Office Supplies', 'description': 'Contract forms, envelopes, pens, receipts, and paper'},
            {'name': 'Cleaning & Housekeeping', 'description': 'Detergents, fabric softeners, bleach, mops, and trash bags'},
        ]
        cat_map = {}
        for cdata in categories_data:
            cat, _ = Category.objects.get_or_create(name=cdata['name'], defaults={'description': cdata['description']})
            cat_map[cat.name] = cat

        # 4. Seed Inventory Items
        sample_items = [
            # OFFICE items
            {'item_name': 'White Satin Towels', 'category': cat_map['Linens & Drapery'], 'unit': 'pcs', 'loc': 'OFFICE', 'qty': 45, 'min': 15, 'cost': Decimal('150.00'), 'sup': 'Manila Textile Corp'},
            {'item_name': 'Chapel Bed Sheets (Cream)', 'category': cat_map['Linens & Drapery'], 'unit': 'sets', 'loc': 'OFFICE', 'qty': 24, 'min': 10, 'cost': Decimal('450.00'), 'sup': 'Manila Textile Corp'},
            {'item_name': 'Guest Register Books', 'category': cat_map['Office Supplies'], 'unit': 'pcs', 'loc': 'OFFICE', 'qty': 18, 'min': 10, 'cost': Decimal('220.00'), 'sup': 'National Book Store'},
            {'item_name': 'Heavy Duty Detergent Powder (10kg)', 'category': cat_map['Cleaning & Housekeeping'], 'unit': 'bags', 'loc': 'OFFICE', 'qty': 8, 'min': 4, 'cost': Decimal('850.00'), 'sup': 'Puregold Wholesale'},
            {'item_name': 'Fabric Softener (5L)', 'category': cat_map['Cleaning & Housekeeping'], 'unit': 'bottles', 'loc': 'OFFICE', 'qty': 2, 'min': 5, 'cost': Decimal('420.00'), 'sup': 'Puregold Wholesale'}, # Low stock

            # C2 Chapel items
            {'item_name': 'White Satin Towels', 'category': cat_map['Linens & Drapery'], 'unit': 'pcs', 'loc': 'C2', 'qty': 12, 'min': 10, 'cost': Decimal('150.00'), 'sup': 'Manila Textile Corp'},
            {'item_name': 'Altar Candles (Large White)', 'category': cat_map['Chapel Supplies'], 'unit': 'pairs', 'loc': 'C2', 'qty': 4, 'min': 6, 'cost': Decimal('320.00'), 'sup': 'Quiapo Candle Works'}, # Low stock
            {'item_name': 'Hand Sanitizer Gel (500ml)', 'category': cat_map['Embalming & Sanitation'], 'unit': 'bottles', 'loc': 'C2', 'qty': 0, 'min': 3, 'cost': Decimal('180.00'), 'sup': 'Mercury Drug'}, # Out of stock

            # C3 Chapel items
            {'item_name': 'Chapel Bed Sheets (Cream)', 'category': cat_map['Linens & Drapery'], 'unit': 'sets', 'loc': 'C3', 'qty': 6, 'min': 5, 'cost': Decimal('450.00'), 'sup': 'Manila Textile Corp'},
            {'item_name': 'Velvet Barong Covers', 'category': cat_map['Linens & Drapery'], 'unit': 'pcs', 'loc': 'C3', 'qty': 15, 'min': 5, 'cost': Decimal('300.00'), 'sup': 'Linen Pro Phils'},

            # SERVICES items
            {'item_name': 'Nitrile Exam Gloves (Box 100)', 'category': cat_map['Embalming & Sanitation'], 'unit': 'boxes', 'loc': 'SERVICES', 'qty': 14, 'min': 5, 'cost': Decimal('380.00'), 'sup': 'MedSupply Ph'},
            {'item_name': 'Sanitizing Disinfectant Solution (Gal)', 'category': cat_map['Embalming & Sanitation'], 'unit': 'gallons', 'loc': 'SERVICES', 'qty': 5, 'min': 3, 'cost': Decimal('650.00'), 'sup': 'Chemical Phils'},
            {'item_name': 'Formal Drape Backdrop Sets', 'category': cat_map['Linens & Drapery'], 'unit': 'sets', 'loc': 'SERVICES', 'qty': 7, 'min': 4, 'cost': Decimal('1200.00'), 'sup': 'Linen Pro Phils'},

            # NC2 items
            {'item_name': 'Floor Disinfectant (Gallon)', 'category': cat_map['Cleaning & Housekeeping'], 'unit': 'gallons', 'loc': 'NC2', 'qty': 3, 'min': 2, 'cost': Decimal('350.00'), 'sup': 'Puregold Wholesale'},
            {'item_name': 'Electric Fan Wall Units', 'category': cat_map['Chapel Supplies'], 'unit': 'units', 'loc': 'NC2', 'qty': 0, 'min': 2, 'cost': Decimal('1850.00'), 'sup': 'Abenson'}, # Out of stock

            # NC3 items
            {'item_name': 'White Satin Towels', 'category': cat_map['Linens & Drapery'], 'unit': 'pcs', 'loc': 'NC3', 'qty': 8, 'min': 10, 'cost': Decimal('150.00'), 'sup': 'Manila Textile Corp'}, # Low stock

            # NO COE items
            {'item_name': 'Hazardous Waste Liners (Roll)', 'category': cat_map['Cleaning & Housekeeping'], 'unit': 'rolls', 'loc': 'NO COE', 'qty': 10, 'min': 4, 'cost': Decimal('280.00'), 'sup': 'Safety First Corp'},
        ]

        for item_data in sample_items:
            loc = locations_map[item_data['loc']]
            item, created = InventoryItem.objects.get_or_create(
                item_name=item_data['item_name'],
                location=loc,
                defaults={
                    'category': item_data['category'],
                    'unit': item_data['unit'],
                    'current_quantity': item_data['qty'],
                    'minimum_stock': item_data['min'],
                    'maximum_stock': item_data['min'] * 5,
                    'cost': item_data['cost'],
                    'supplier': item_data['sup'],
                    'is_active': True,
                }
            )
            if created:
                InventoryTransaction.objects.create(
                    item=item,
                    transaction_type=InventoryTransaction.TransactionType.STOCK_IN,
                    quantity=item.current_quantity,
                    to_location=loc,
                    user=admin_user,
                    reason='Initial Stock Intake on Setup'
                )

        # 5. Seed Laundry Records
        today = datetime.date.today()
        yesterday = today - datetime.timedelta(days=1)
        two_days_ago = today - datetime.timedelta(days=2)
        three_days_ago = today - datetime.timedelta(days=3)

        sample_laundry = [
            # Batch 1: Completed and Returned
            {
                'loc': 'C2', 'item': 'Chapel Curtains & Drapes', 'qty': 16,
                'in_date': three_days_ago, 'in_time': '09:00 AM', 'in_shift': '8am to 5pm', 'in_charge': 'Juan Dela Cruz',
                'laba_date': three_days_ago, 'laba_time': '10:30 AM', 'laba_shift': '8am to 5pm', 'laba_in_charge': 'Pedro Santos',
                'banlaw_date': three_days_ago, 'banlaw_time': '04:15 PM', 'banlaw_shift': '4pm to 1am', 'banlaw_in_charge': 'Pedro Santos',
                'sampay_date': two_days_ago, 'sampay_time': '08:30 AM', 'sampay_shift': '8am to 5pm', 'sampay_in_charge': 'Maria Garcia',
                'pinaw_date': two_days_ago, 'pinaw_time': '05:00 PM', 'pinaw_shift': '4pm to 1am', 'pinaw_in_charge': 'Elena Reyes',
                'tiklop_date': yesterday, 'tiklop_time': '09:15 AM', 'tiklop_shift': '8am to 5pm', 'tiklop_in_charge': 'Elena Reyes',
                'ret_date': yesterday, 'ret_time': '02:30 PM', 'ret_by': 'Juan Dela Cruz',
                'encoded_by': 'Admin Officer', 'notes': 'Freshly laundered for weekend viewing service.'
            },
            # Batch 2: Folding (Ready for Return)
            {
                'loc': 'C3', 'item': 'White Bed Sheets & Pillowcases', 'qty': 24,
                'in_date': two_days_ago, 'in_time': '08:30 AM', 'in_shift': '8am to 5pm', 'in_charge': 'Maria Garcia',
                'laba_date': two_days_ago, 'laba_time': '10:00 AM', 'laba_shift': '8am to 5pm', 'laba_in_charge': 'Pedro Santos',
                'banlaw_date': two_days_ago, 'banlaw_time': '04:30 PM', 'banlaw_shift': '4pm to 1am', 'banlaw_in_charge': 'Pedro Santos',
                'sampay_date': yesterday, 'sampay_time': '09:00 AM', 'sampay_shift': '8am to 5pm', 'sampay_in_charge': 'Maria Garcia',
                'pinaw_date': yesterday, 'pinaw_time': '06:00 PM', 'pinaw_shift': '4pm to 1am', 'pinaw_in_charge': 'Elena Reyes',
                'tiklop_date': today, 'tiklop_time': '08:45 AM', 'tiklop_shift': '8am to 5pm', 'tiklop_in_charge': 'Elena Reyes',
                'ret_date': None, 'ret_time': '', 'ret_by': '',
                'encoded_by': 'Admin Officer', 'notes': 'Folded and bagged, awaiting delivery to C3.'
            },
            # Batch 3: Pinaw (Ironing/Pressing)
            {
                'loc': 'SERVICES', 'item': 'Velvet Barong Covers & Tablecloths', 'qty': 12,
                'in_date': yesterday, 'in_time': '09:00 AM', 'in_shift': '8am to 5pm', 'in_charge': 'Juan Dela Cruz',
                'laba_date': yesterday, 'laba_time': '11:15 AM', 'laba_shift': '8am to 5pm', 'laba_in_charge': 'Pedro Santos',
                'banlaw_date': yesterday, 'banlaw_time': '05:00 PM', 'banlaw_shift': '4pm to 1am', 'banlaw_in_charge': 'Pedro Santos',
                'sampay_date': yesterday, 'sampay_time': '07:30 PM', 'sampay_shift': '4pm to 1am', 'sampay_in_charge': 'Maria Garcia',
                'pinaw_date': today, 'pinaw_time': '09:30 AM', 'pinaw_shift': '8am to 5pm', 'pinaw_in_charge': 'Elena Reyes',
                'tiklop_date': None, 'tiklop_time': '', 'tiklop_shift': '', 'tiklop_in_charge': '',
                'ret_date': None, 'ret_time': '', 'ret_by': '',
                'encoded_by': 'Admin Officer', 'notes': 'Delicate barong fabric; steam press carefully.'
            },
            # Batch 4: Sampay (Hanging/Drying)
            {
                'loc': 'OFFICE', 'item': 'Staff Uniforms & Aprons', 'qty': 18,
                'in_date': yesterday, 'in_time': '04:30 PM', 'in_shift': '4pm to 1am', 'in_charge': 'Maria Garcia',
                'laba_date': yesterday, 'laba_time': '06:00 PM', 'laba_shift': '4pm to 1am', 'laba_in_charge': 'Pedro Santos',
                'banlaw_date': today, 'banlaw_time': '08:45 AM', 'banlaw_shift': '8am to 5pm', 'banlaw_in_charge': 'Pedro Santos',
                'sampay_date': today, 'sampay_time': '10:00 AM', 'sampay_shift': '8am to 5pm', 'sampay_in_charge': 'Maria Garcia',
                'pinaw_date': None, 'pinaw_time': '', 'pinaw_shift': '', 'pinaw_in_charge': '',
                'tiklop_date': None, 'tiklop_time': '', 'tiklop_shift': '', 'tiklop_in_charge': '',
                'ret_date': None, 'ret_time': '', 'ret_by': '',
                'encoded_by': 'Admin Officer', 'notes': 'Hanging in drying bay #2.'
            },
            # Batch 5: Laba (Washing)
            {
                'loc': 'NC2', 'item': 'Satin Towels & Headrest Linens', 'qty': 30,
                'in_date': today, 'in_time': '08:15 AM', 'in_shift': '8am to 5pm', 'in_charge': 'Juan Dela Cruz',
                'laba_date': today, 'laba_time': '09:45 AM', 'laba_shift': '8am to 5pm', 'laba_in_charge': 'Pedro Santos',
                'banlaw_date': None, 'banlaw_time': '', 'banlaw_shift': '', 'banlaw_in_charge': '',
                'sampay_date': None, 'sampay_time': '', 'sampay_shift': '', 'sampay_in_charge': '',
                'pinaw_date': None, 'pinaw_time': '', 'pinaw_shift': '', 'pinaw_in_charge': '',
                'tiklop_date': None, 'tiklop_time': '', 'tiklop_shift': '', 'tiklop_in_charge': '',
                'ret_date': None, 'ret_time': '', 'ret_by': '',
                'encoded_by': 'Admin Officer', 'notes': 'Pre-soaking with gentle disinfectant.'
            },
            # Batch 6: Newly arrived (For Laba)
            {
                'loc': 'NC3', 'item': 'Viewing Chapel Runners & Valances', 'qty': 8,
                'in_date': today, 'in_time': '01:30 AM', 'in_shift': '12midnight to 9am', 'in_charge': 'Juan Dela Cruz',
                'laba_date': None, 'laba_time': '', 'laba_shift': '', 'laba_in_charge': '',
                'banlaw_date': None, 'banlaw_time': '', 'banlaw_shift': '', 'banlaw_in_charge': '',
                'sampay_date': None, 'sampay_time': '', 'sampay_shift': '', 'sampay_in_charge': '',
                'pinaw_date': None, 'pinaw_time': '', 'pinaw_shift': '', 'pinaw_in_charge': '',
                'tiklop_date': None, 'tiklop_time': '', 'tiklop_shift': '', 'tiklop_in_charge': '',
                'ret_date': None, 'ret_time': '', 'ret_by': '',
                'encoded_by': 'Admin Officer', 'notes': 'Scheduled for next washing cycle.'
            },
        ]

        for lb in sample_laundry:
            loc = locations_map[lb['loc']]
            if not LaundryRecord.objects.filter(location=loc, item=lb['item'], laundry_in_date=lb['in_date']).exists():
                LaundryRecord.objects.create(
                    location=loc,
                    item=lb['item'],
                    quantity=lb['qty'],
                    laundry_in_date=lb['in_date'],
                    laundry_in_time=lb.get('in_time', ''),
                    laundry_in_shift=lb['in_shift'],
                    laundry_in_charge=lb['in_charge'],
                    laba_date=lb['laba_date'],
                    laba_time=lb.get('laba_time', ''),
                    laba_shift=lb['laba_shift'],
                    laba_in_charge=lb['laba_in_charge'],
                    banlaw_date=lb['banlaw_date'],
                    banlaw_time=lb.get('banlaw_time', ''),
                    banlaw_shift=lb['banlaw_shift'],
                    banlaw_in_charge=lb['banlaw_in_charge'],
                    sampay_date=lb['sampay_date'],
                    sampay_time=lb.get('sampay_time', ''),
                    sampay_shift=lb['sampay_shift'],
                    sampay_in_charge=lb['sampay_in_charge'],
                    pinaw_date=lb['pinaw_date'],
                    pinaw_time=lb.get('pinaw_time', ''),
                    pinaw_shift=lb['pinaw_shift'],
                    pinaw_in_charge=lb['pinaw_in_charge'],
                    tiklop_date=lb['tiklop_date'],
                    tiklop_time=lb.get('tiklop_time', ''),
                    tiklop_shift=lb['tiklop_shift'],
                    tiklop_in_charge=lb['tiklop_in_charge'],
                    date_returned=lb['ret_date'],
                    returned_time=lb.get('ret_time', ''),
                    returned_by=lb['ret_by'],
                    encoded_by=lb['encoded_by'],
                    notes=lb['notes']
                )

        # 6. Seed Caskets
        sample_caskets = [
            {'casket_id': 'CSK-2026-001', 'model': 'Presidential Supreme', 'type': 'Solid Wood', 'size': 'Standard Adult', 'color': 'Mahogany Gloss', 'mat': 'Solid Mahogany', 'sup': 'Royal Caskets PH', 'cost': Decimal('45000.00'), 'price': Decimal('85000.00'), 'loc': 'SERVICES', 'cond': 'NEW', 'status': 'AVAILABLE', 'rec': today - datetime.timedelta(days=15)},
            {'casket_id': 'CSK-2026-002', 'model': 'Heritage Velvet Oak', 'type': 'Wood', 'size': 'Standard Adult', 'color': 'Natural Oak', 'mat': 'Oak Wood', 'sup': 'Royal Caskets PH', 'cost': Decimal('32000.00'), 'price': Decimal('62000.00'), 'loc': 'SERVICES', 'cond': 'NEW', 'status': 'AVAILABLE', 'rec': today - datetime.timedelta(days=20)},
            {'casket_id': 'CSK-2026-003', 'model': 'Silver Mist 18-Gauge', 'type': 'Metal', 'size': 'Standard Adult', 'color': 'Silver Gray Shimmer', 'mat': '18-Gauge Steel', 'sup': 'Batesville Distributor', 'cost': Decimal('55000.00'), 'price': Decimal('98000.00'), 'loc': 'SERVICES', 'cond': 'NEW', 'status': 'RESERVED', 'rec': today - datetime.timedelta(days=10)},
            {'casket_id': 'CSK-2026-004', 'model': 'White Rose Angelic', 'type': 'Semi-Metal', 'size': 'Standard Adult', 'color': 'Pearlescent White', 'mat': '20-Gauge Steel / Wood Base', 'sup': 'Luzon Casket Crafters', 'cost': Decimal('28000.00'), 'price': Decimal('52000.00'), 'loc': 'SERVICES', 'cond': 'GOOD', 'status': 'AVAILABLE', 'rec': today - datetime.timedelta(days=25)},
            {'casket_id': 'CSK-2026-005', 'model': 'Simplicity Pine', 'type': 'Cremation', 'size': 'Standard Adult', 'color': 'Natural Pine', 'mat': 'Pine Wood', 'sup': 'Eco-Caskets Co.', 'cost': Decimal('15000.00'), 'price': Decimal('28000.00'), 'loc': 'OFFICE', 'cond': 'NEW', 'status': 'AVAILABLE', 'rec': today - datetime.timedelta(days=8)},
            {'casket_id': 'CSK-2026-006', 'model': 'Classic Walnut Elegance', 'type': 'Wood', 'size': 'Standard Adult', 'color': 'Dark Walnut', 'mat': 'Walnut Finish Hardwood', 'sup': 'Royal Caskets PH', 'cost': Decimal('38000.00'), 'price': Decimal('68000.00'), 'loc': 'SERVICES', 'cond': 'NEEDS_REPAIR', 'status': 'FOR_REPAIR', 'rec': today - datetime.timedelta(days=35)},
        ]

        for cdata in sample_caskets:
            loc = locations_map[cdata['loc']]
            cask, created = Casket.objects.get_or_create(
                casket_id=cdata['casket_id'],
                defaults={
                    'model': cdata['model'],
                    'casket_type': cdata['type'],
                    'size': cdata['size'],
                    'color': cdata['color'],
                    'material': cdata['mat'],
                    'supplier': cdata['sup'],
                    'purchase_cost': cdata['cost'],
                    'selling_price': cdata['price'],
                    'location': loc,
                    'condition': cdata['cond'],
                    'status': cdata['status'],
                    'date_received': cdata['rec'],
                    'notes': f"Inspected on {cdata['rec']}."
                }
            )
            if created and cask.status == 'RESERVED':
                CasketTransaction.objects.create(
                    casket=cask,
                    action=CasketTransaction.Action.RESERVE,
                    user=admin_user,
                    deceased_name='Santos Family Service',
                    contract_number='AFH-2026-089',
                    notes='Reserved for service starting next week.'
                )

        # 7. Seed Chapel Maintenance Requests
        sample_maintenance = [
            {'mid': 'MNT-20261001-001', 'loc': 'C2', 'cat': 'Air Conditioning', 'issue': 'Split AC Unit #2 not cooling properly', 'desc': 'Air conditioner is blowing room temperature air during afternoon viewing.', 'prio': 'URGENT', 'rep_by': 'Juan Dela Cruz', 'rep_date': today - datetime.timedelta(days=1), 'assigned': 'CoolTech Air Solutions', 'status': 'IN_PROGRESS', 'cost': Decimal('3500.00')},
            {'mid': 'MNT-20261001-002', 'loc': 'C3', 'cat': 'Lighting', 'issue': 'Flickering chandelier bulb on altar left wing', 'desc': 'Three warm-white LED candle bulbs need replacement.', 'prio': 'MEDIUM', 'rep_by': 'Elena Reyes', 'rep_date': today - datetime.timedelta(days=2), 'assigned': 'Internal Maintenance', 'status': 'REPORTED', 'cost': Decimal('600.00')},
            {'mid': 'MNT-20261001-003', 'loc': 'SERVICES', 'cat': 'Plumbing', 'issue': 'Drain trap leakage in prep sink #1', 'desc': 'Minor dripping under the stainless embalming sink pipe fitting.', 'prio': 'HIGH', 'rep_by': 'Pedro Santos', 'rep_date': today - datetime.timedelta(days=3), 'assigned': 'FastFlow Plumbing', 'status': 'PENDING', 'cost': Decimal('1800.00')},
            {'mid': 'MNT-20261001-004', 'loc': 'NC2', 'cat': 'Doors/Locks', 'issue': 'Main entrance magnetic latch sticking', 'desc': 'Door latch requires lubrication and adjustment.', 'prio': 'LOW', 'rep_by': 'Maria Garcia', 'rep_date': today - datetime.timedelta(days=5), 'assigned': 'Internal Maintenance', 'status': 'COMPLETED', 'cost': Decimal('350.00')},
        ]

        for mdata in sample_maintenance:
            loc = locations_map[mdata['loc']]
            Maintenance.objects.get_or_create(
                maintenance_id=mdata['mid'],
                defaults={
                    'location': loc,
                    'category': mdata['cat'],
                    'issue': mdata['issue'],
                    'description': mdata['desc'],
                    'priority': mdata['prio'],
                    'reported_by': mdata['rep_by'],
                    'date_reported': mdata['rep_date'],
                    'assigned_to': mdata['assigned'],
                    'status': mdata['status'],
                    'cost': mdata['cost'],
                    'date_completed': mdata['rep_date'] + datetime.timedelta(days=1) if mdata['status'] == 'COMPLETED' else None
                }
            )

        # 8. Seed Water and Electricity Bills
        sample_water = [
            {'loc': 'OFFICE', 'prov': 'Maynilad Water Services', 'meter': 'MYN-882319', 'prev': Decimal('1420.50'), 'curr': Decimal('1485.00'), 'period': 'September 2026', 'bdate': today - datetime.timedelta(days=25), 'ddate': today - datetime.timedelta(days=5), 'amt': Decimal('4250.75'), 'status': 'OVERDUE', 'paid': None},
            {'loc': 'SERVICES', 'prov': 'Maynilad Water Services', 'meter': 'MYN-882320', 'prev': Decimal('2100.00'), 'curr': Decimal('2215.30'), 'period': 'September 2026', 'bdate': today - datetime.timedelta(days=25), 'ddate': today + datetime.timedelta(days=5), 'amt': Decimal('8950.20'), 'status': 'UNPAID', 'paid': None},
            {'loc': 'C2', 'prov': 'Maynilad Water Services', 'meter': 'MYN-882321', 'prev': Decimal('980.00'), 'curr': Decimal('1025.00'), 'period': 'August 2026', 'bdate': today - datetime.timedelta(days=55), 'ddate': today - datetime.timedelta(days=35), 'amt': Decimal('3100.00'), 'status': 'PAID', 'paid': today - datetime.timedelta(days=36)},
        ]
        for wb in sample_water:
            loc = locations_map[wb['loc']]
            if not WaterBill.objects.filter(location=loc, billing_period=wb['period']).exists():
                WaterBill.objects.create(
                    location=loc,
                    provider=wb['prov'],
                    meter_number=wb['meter'],
                    previous_reading=wb['prev'],
                    current_reading=wb['curr'],
                    billing_period=wb['period'],
                    bill_date=wb['bdate'],
                    due_date=wb['ddate'],
                    amount=wb['amt'],
                    payment_status=wb['status'],
                    date_paid=wb['paid']
                )

        sample_electricity = [
            {'loc': 'C2', 'prov': 'Meralco', 'meter': 'MER-901124-C2', 'prev': Decimal('18450.00'), 'curr': Decimal('19820.00'), 'period': 'September 2026', 'bdate': today - datetime.timedelta(days=20), 'ddate': today + datetime.timedelta(days=3), 'amt': Decimal('16500.50'), 'status': 'UNPAID', 'paid': None},
            {'loc': 'SERVICES', 'prov': 'Meralco', 'meter': 'MER-901124-SRV', 'prev': Decimal('24100.00'), 'curr': Decimal('25980.00'), 'period': 'September 2026', 'bdate': today - datetime.timedelta(days=20), 'ddate': today - datetime.timedelta(days=2), 'amt': Decimal('22840.00'), 'status': 'OVERDUE', 'paid': None},
            {'loc': 'OFFICE', 'prov': 'Meralco', 'meter': 'MER-901124-OFF', 'prev': Decimal('12300.00'), 'curr': Decimal('12950.00'), 'period': 'August 2026', 'bdate': today - datetime.timedelta(days=50), 'ddate': today - datetime.timedelta(days=30), 'amt': Decimal('7890.00'), 'status': 'PAID', 'paid': today - datetime.timedelta(days=32)},
        ]
        for eb in sample_electricity:
            loc = locations_map[eb['loc']]
            if not ElectricityBill.objects.filter(location=loc, billing_period=eb['period']).exists():
                ElectricityBill.objects.create(
                    location=loc,
                    provider=eb['prov'],
                    meter_number=eb['meter'],
                    previous_reading=eb['prev'],
                    current_reading=eb['curr'],
                    billing_period=eb['period'],
                    bill_date=eb['bdate'],
                    due_date=eb['ddate'],
                    amount=eb['amt'],
                    payment_status=eb['status'],
                    date_paid=eb['paid']
                )

        self.stdout.write(self.style.SUCCESS("[OK] Successfully seeded initial Alaala Funeral Homes operational records!"))
        self.stdout.write(self.style.SUCCESS("  - 7 Standard Locations initialized"))
        self.stdout.write(self.style.SUCCESS("  - Categories and inventory across multiple locations"))
        self.stdout.write(self.style.SUCCESS("  - Multi-stage laundry records according to exact Alaala workflow"))
        self.stdout.write(self.style.SUCCESS("  - Caskets, Maintenance, and Utilities seeded"))
        self.stdout.write(self.style.SUCCESS("  - Demo credentials: admin / Admin123!, manager / Manager123!, staff / Staff123!"))
