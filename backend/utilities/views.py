from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from .models import WaterBill, ElectricityBill
from .serializers import WaterBillSerializer, ElectricityBillSerializer
from core.audit import log_audit
from core.permissions import IsMasterAdmin, CanAccessWater, CanAccessElectricity
from alaala_backend.realtime import broadcast_event


class WaterBillViewSet(viewsets.ModelViewSet):
    queryset = WaterBill.objects.select_related('location').all()
    serializer_class = WaterBillSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsMasterAdmin()]
        return [CanAccessWater()]

    def perform_destroy(self, instance):
        uid = instance.id
        loc = instance.location.name
        period = instance.billing_period
        instance.delete()
        log_audit(self.request, 'DELETE', 'WATER', uid, f"{loc} - {period}", f"Deleted water bill for {loc} ({period})")
        broadcast_event('water.deleted', {'id': uid})

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_master_admin:
            loc_ids = self.request.user.get_accessible_location_ids()
            qs = qs.filter(location_id__in=loc_ids)

        location_id = self.request.query_params.get('location')
        payment_status = self.request.query_params.get('payment_status')
        period = self.request.query_params.get('billing_period')
        search = self.request.query_params.get('search')

        if location_id:
            qs = qs.filter(location_id=location_id)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        if period:
            qs = qs.filter(billing_period__icontains=period)
        if search:
            qs = qs.filter(
                Q(meter_number__icontains=search) |
                Q(provider__icontains=search) |
                Q(billing_period__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        bill = serializer.save()
        log_audit(
            self.request, 'CREATE', 'WATER', bill.id, f"{bill.location.name} - {bill.billing_period}",
            f"Recorded water bill for {bill.location.name} ({bill.billing_period}): PHP {bill.amount}."
        )
        broadcast_event('water.updated', {'id': bill.id, 'location': bill.location.name, 'amount': float(bill.amount)})

    def perform_update(self, serializer):
        bill = serializer.save()
        log_audit(
            self.request, 'UPDATE', 'WATER', bill.id, f"{bill.location.name} - {bill.billing_period}",
            f"Updated water bill for {bill.location.name} ({bill.billing_period}): status={bill.payment_status}."
        )
        broadcast_event('water.updated', {'id': bill.id, 'location': bill.location.name, 'amount': float(bill.amount)})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        total_amount = qs.aggregate(Sum('amount'))['amount__sum'] or 0
        total_consumption = qs.aggregate(Sum('consumption'))['consumption__sum'] or 0
        unpaid = qs.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        return Response({
            'total_amount': float(total_amount),
            'total_consumption': float(total_consumption),
            'unpaid_count': unpaid['count'] or 0,
            'unpaid_amount': float(unpaid['total'] or 0),
        })


class ElectricityBillViewSet(viewsets.ModelViewSet):
    queryset = ElectricityBill.objects.select_related('location').all()
    serializer_class = ElectricityBillSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsMasterAdmin()]
        return [CanAccessElectricity()]

    def perform_destroy(self, instance):
        uid = instance.id
        loc = instance.location.name
        period = instance.billing_period
        instance.delete()
        log_audit(self.request, 'DELETE', 'ELECTRICITY', uid, f"{loc} - {period}", f"Deleted electricity bill for {loc} ({period})")
        broadcast_event('electricity.deleted', {'id': uid})

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_master_admin:
            loc_ids = self.request.user.get_accessible_location_ids()
            qs = qs.filter(location_id__in=loc_ids)

        location_id = self.request.query_params.get('location')
        payment_status = self.request.query_params.get('payment_status')
        period = self.request.query_params.get('billing_period')
        search = self.request.query_params.get('search')

        if location_id:
            qs = qs.filter(location_id=location_id)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        if period:
            qs = qs.filter(billing_period__icontains=period)
        if search:
            qs = qs.filter(
                Q(meter_number__icontains=search) |
                Q(provider__icontains=search) |
                Q(billing_period__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        bill = serializer.save()
        log_audit(
            self.request, 'CREATE', 'ELECTRICITY', bill.id, f"{bill.location.name} - {bill.billing_period}",
            f"Recorded electricity bill for {bill.location.name} ({bill.billing_period}): PHP {bill.amount}."
        )
        broadcast_event('electricity.updated', {'id': bill.id, 'location': bill.location.name, 'amount': float(bill.amount)})

    def perform_update(self, serializer):
        bill = serializer.save()
        log_audit(
            self.request, 'UPDATE', 'ELECTRICITY', bill.id, f"{bill.location.name} - {bill.billing_period}",
            f"Updated electricity bill for {bill.location.name} ({bill.billing_period}): status={bill.payment_status}."
        )
        broadcast_event('electricity.updated', {'id': bill.id, 'location': bill.location.name, 'amount': float(bill.amount)})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        total_amount = qs.aggregate(Sum('amount'))['amount__sum'] or 0
        total_consumption = qs.aggregate(Sum('consumption'))['consumption__sum'] or 0
        unpaid = qs.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        return Response({
            'total_amount': float(total_amount),
            'total_consumption': float(total_consumption),
            'unpaid_count': unpaid['count'] or 0,
            'unpaid_amount': float(unpaid['total'] or 0),
        })
