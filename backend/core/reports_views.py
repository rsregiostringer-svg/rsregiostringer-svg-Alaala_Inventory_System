import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count, Q
from inventory.models import InventoryItem, InventoryTransaction
from laundry.models import LaundryRecord
from caskets.models import Casket
from maintenance.models import Maintenance
from utilities.models import WaterBill, ElectricityBill


class ReportsSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Filter helpers
        def apply_loc(qs, field='location_id'):
            return qs.filter(**{field: location_id}) if location_id else qs

        # Inventory Stats
        items_qs = apply_loc(InventoryItem.objects.filter(is_active=True))
        total_items = items_qs.count()
        total_qty = items_qs.aggregate(Sum('current_quantity'))['current_quantity__sum'] or 0
        total_cost_val = sum(item.current_quantity * float(item.cost) for item in items_qs)
        low_stock = items_qs.filter(status='LOW_STOCK').count()
        out_of_stock = items_qs.filter(status='OUT_OF_STOCK').count()

        # Laundry Stats
        laundry_qs = apply_loc(LaundryRecord.objects.all())
        if start_date:
            laundry_qs = laundry_qs.filter(laundry_in_date__gte=start_date)
        if end_date:
            laundry_qs = laundry_qs.filter(laundry_in_date__lte=end_date)
        laundry_total = laundry_qs.count()
        laundry_in_process = laundry_qs.exclude(status='RETURNED').count()
        laundry_returned = laundry_qs.filter(status='RETURNED').count()

        # Caskets Stats
        caskets_qs = apply_loc(Casket.objects.all())
        caskets_available = caskets_qs.filter(status='AVAILABLE').aggregate(Sum('quantity'))['quantity__sum'] or 0
        caskets_reserved = caskets_qs.filter(status='RESERVED').aggregate(Sum('quantity'))['quantity__sum'] or 0
        caskets_sold = caskets_qs.filter(status='SOLD').aggregate(Sum('quantity'))['quantity__sum'] or 0
        caskets_repair = caskets_qs.filter(status='FOR_REPAIR').aggregate(Sum('quantity'))['quantity__sum'] or 0

        # Maintenance Stats
        maint_qs = apply_loc(Maintenance.objects.all())
        if start_date:
            maint_qs = maint_qs.filter(date_reported__gte=start_date)
        if end_date:
            maint_qs = maint_qs.filter(date_reported__lte=end_date)
        maint_total = maint_qs.count()
        maint_completed = maint_qs.filter(status='COMPLETED').count()
        maint_open = maint_qs.filter(status__in=['REPORTED', 'PENDING', 'IN_PROGRESS']).count()
        maint_cost = maint_qs.aggregate(Sum('cost'))['cost__sum'] or 0

        # Utilities Stats
        water_qs = apply_loc(WaterBill.objects.all())
        elec_qs = apply_loc(ElectricityBill.objects.all())
        if start_date:
            water_qs = water_qs.filter(due_date__gte=start_date)
            elec_qs = elec_qs.filter(due_date__gte=start_date)
        if end_date:
            water_qs = water_qs.filter(due_date__lte=end_date)
            elec_qs = elec_qs.filter(due_date__lte=end_date)

        water_amount = water_qs.aggregate(Sum('amount'))['amount__sum'] or 0
        water_consumption = water_qs.aggregate(Sum('consumption'))['consumption__sum'] or 0
        water_unpaid = water_qs.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(Sum('amount'))['amount__sum'] or 0

        elec_amount = elec_qs.aggregate(Sum('amount'))['amount__sum'] or 0
        elec_consumption = elec_qs.aggregate(Sum('consumption'))['consumption__sum'] or 0
        elec_unpaid = elec_qs.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(Sum('amount'))['amount__sum'] or 0

        return Response({
            'inventory': {
                'total_items': total_items,
                'total_quantity': total_qty,
                'valuation': float(total_cost_val),
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
            },
            'laundry': {
                'total': laundry_total,
                'in_process': laundry_in_process,
                'returned': laundry_returned,
            },
            'caskets': {
                'available': caskets_available,
                'reserved': caskets_reserved,
                'sold': caskets_sold,
                'for_repair': caskets_repair,
            },
            'maintenance': {
                'total_tickets': maint_total,
                'open_tickets': maint_open,
                'completed_tickets': maint_completed,
                'total_cost': float(maint_cost),
            },
            'utilities': {
                'water_amount': float(water_amount),
                'water_consumption': float(water_consumption),
                'water_unpaid': float(water_unpaid),
                'electricity_amount': float(elec_amount),
                'electricity_consumption': float(elec_consumption),
                'electricity_unpaid': float(elec_unpaid),
                'total_utility_cost': float(water_amount + elec_amount),
                'total_unpaid': float(water_unpaid + elec_unpaid),
            }
        })


class ExportCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        module = request.query_params.get('module', 'inventory').lower()
        location_id = request.query_params.get('location')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="alaala_{module}_report.csv"'
        writer = csv.writer(response)

        if module == 'inventory':
            writer.writerow(['ID', 'Item Name', 'Category', 'Location', 'Quantity', 'Unit', 'Min Stock', 'Cost (PHP)', 'Total Value (PHP)', 'Status'])
            items = InventoryItem.objects.select_related('category', 'location').filter(is_active=True)
            if location_id:
                items = items.filter(location_id=location_id)
            for it in items:
                val = it.current_quantity * float(it.cost)
                writer.writerow([it.id, it.item_name, it.category.name, it.location.name, it.current_quantity, it.unit, it.minimum_stock, it.cost, f"{val:.2f}", it.status])

        elif module == 'transactions':
            writer.writerow(['Date', 'Type', 'Item', 'Qty', 'From Location', 'To Location', 'Reason', 'User', 'Notes'])
            txs = InventoryTransaction.objects.select_related('item', 'from_location', 'to_location', 'user').all()
            if location_id:
                txs = txs.filter(Q(from_location_id=location_id) | Q(to_location_id=location_id))
            if start_date:
                txs = txs.filter(created_at__date__gte=start_date)
            if end_date:
                txs = txs.filter(created_at__date__lte=end_date)
            for t in txs:
                writer.writerow([
                    t.created_at.strftime('%Y-%m-%d %H:%M'),
                    t.transaction_type,
                    t.item.item_name,
                    t.quantity,
                    t.from_location.name if t.from_location else '',
                    t.to_location.name if t.to_location else '',
                    t.reason,
                    t.user.username if t.user else '',
                    t.notes
                ])

        elif module == 'laundry':
            writer.writerow([
                'Laundry IN (Date/ Shift/ In Charge)',
                'Items',
                'Quantity',
                'Laba (Date/Shift/ In Charge)',
                'Banlaw (Date/Shift/ In Charge)',
                'Sampay (Date/Shift/ In Charge)',
                'Pinaw (Date/Shift/ In Charge)',
                'Tiklop (Date/Shift/ In Charge)',
                'Date Returned/ By',
                'Encoded By',
                'Status'
            ])
            recs = LaundryRecord.objects.select_related('location').all()
            if location_id:
                recs = recs.filter(location_id=location_id)
            if start_date:
                recs = recs.filter(laundry_in_date__gte=start_date)
            if end_date:
                recs = recs.filter(laundry_in_date__lte=end_date)
            for r in recs:
                laundry_in_str = f"{r.laundry_in_date} / {r.laundry_in_shift} / {r.laundry_in_charge}"
                laba_str = f"{r.laba_date} / {r.laba_shift or ''} / {r.laba_in_charge or ''}" if r.laba_date else ""
                banlaw_str = f"{r.banlaw_date} / {r.banlaw_shift or ''} / {r.banlaw_in_charge or ''}" if r.banlaw_date else ""
                sampay_str = f"{r.sampay_date} / {r.sampay_shift or ''} / {r.sampay_in_charge or ''}" if r.sampay_date else ""
                pinaw_str = f"{r.pinaw_date} / {r.pinaw_shift or ''} / {r.pinaw_in_charge or ''}" if r.pinaw_date else ""
                tiklop_str = f"{r.tiklop_date} / {r.tiklop_shift or ''} / {r.tiklop_in_charge or ''}" if r.tiklop_date else ""
                returned_str = f"{r.date_returned} / {r.returned_by or ''}" if r.date_returned else ""
                writer.writerow([
                    laundry_in_str,
                    f"{r.item} ({r.location.name})",
                    r.quantity,
                    laba_str,
                    banlaw_str,
                    sampay_str,
                    pinaw_str,
                    tiklop_str,
                    returned_str,
                    r.encoded_by,
                    r.get_status_display()
                ])

        elif module == 'caskets':
            writer.writerow(['Casket ID', 'Model', 'Type', 'Size', 'Color', 'Material', 'Location', 'Cost (PHP)', 'Price (PHP)', 'Condition', 'Status', 'Received Date'])
            caskets = Casket.objects.select_related('location').all()
            if location_id:
                caskets = caskets.filter(location_id=location_id)
            for c in caskets:
                writer.writerow([
                    c.casket_id, c.model, c.casket_type, c.size, c.color, c.material,
                    c.location.name, c.purchase_cost, c.selling_price, c.condition, c.status, c.date_received
                ])

        elif module == 'maintenance':
            writer.writerow(['ID', 'Location', 'Category', 'Issue', 'Priority', 'Reported By', 'Date Reported', 'Assigned To', 'Status', 'Cost (PHP)', 'Completed Date'])
            reqs = Maintenance.objects.select_related('location').all()
            if location_id:
                reqs = reqs.filter(location_id=location_id)
            if start_date:
                reqs = reqs.filter(date_reported__gte=start_date)
            if end_date:
                reqs = reqs.filter(date_reported__lte=end_date)
            for m in reqs:
                writer.writerow([
                    m.maintenance_id, m.location.name, m.category, m.issue, m.priority,
                    m.reported_by, m.date_reported, m.assigned_to, m.status, m.cost, m.date_completed or ''
                ])

        elif module == 'water':
            writer.writerow(['Location', 'Provider', 'Meter Number', 'Billing Period', 'Bill Date', 'Due Date', 'Prev Reading', 'Current Reading', 'Consumption (m3)', 'Amount (PHP)', 'Status', 'Date Paid'])
            bills = WaterBill.objects.select_related('location').all()
            if location_id:
                bills = bills.filter(location_id=location_id)
            for b in bills:
                writer.writerow([
                    b.location.name, b.provider, b.meter_number, b.billing_period,
                    b.bill_date, b.due_date, b.previous_reading, b.current_reading,
                    b.consumption, b.amount, b.payment_status, b.date_paid or ''
                ])

        elif module == 'electricity':
            writer.writerow(['Location', 'Provider', 'Meter Number', 'Billing Period', 'Bill Date', 'Due Date', 'Prev Reading', 'Current Reading', 'Consumption (kWh)', 'Amount (PHP)', 'Status', 'Date Paid'])
            bills = ElectricityBill.objects.select_related('location').all()
            if location_id:
                bills = bills.filter(location_id=location_id)
            for b in bills:
                writer.writerow([
                    b.location.name, b.provider, b.meter_number, b.billing_period,
                    b.bill_date, b.due_date, b.previous_reading, b.current_reading,
                    b.consumption, b.amount, b.payment_status, b.date_paid or ''
                ])

        return response
