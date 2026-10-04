from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from .models import Casket, CasketTransaction
from .serializers import CasketSerializer, CasketTransactionSerializer
from core.audit import log_audit
from core.permissions import IsMasterAdmin
from alaala_backend.realtime import broadcast_event


class CasketViewSet(viewsets.ModelViewSet):
    queryset = Casket.objects.select_related('location').prefetch_related('history').all()
    serializer_class = CasketSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsMasterAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_destroy(self, instance):
        uid = instance.id
        repr_val = f"{instance.casket_id} - {instance.model}"
        instance.delete()
        log_audit(self.request, 'DELETE', 'CASKETS', uid, repr_val, f"Deleted casket '{repr_val}'")
        broadcast_event('casket.deleted', {'id': uid, 'casket_id': instance.casket_id})

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get('location')
        casket_status = self.request.query_params.get('status')
        condition = self.request.query_params.get('condition')
        casket_type = self.request.query_params.get('type')
        search = self.request.query_params.get('search')

        if location_id:
            qs = qs.filter(location_id=location_id)
        if casket_status:
            qs = qs.filter(status=casket_status)
        if condition:
            qs = qs.filter(condition=condition)
        if casket_type:
            qs = qs.filter(casket_type__iexact=casket_type)
        if search:
            qs = qs.filter(
                Q(casket_id__icontains=search) |
                Q(model__icontains=search) |
                Q(material__icontains=search) |
                Q(color__icontains=search) |
                Q(supplier__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        casket = serializer.save()
        CasketTransaction.objects.create(
            casket=casket,
            action=CasketTransaction.Action.RECEIVE,
            user=self.request.user,
            new_status=casket.status,
            notes='Initial intake into casket inventory.'
        )
        log_audit(
            self.request, 'CREATE', 'CASKETS', casket.id, f"{casket.casket_id} - {casket.model}",
            f"Added casket '{casket.casket_id}' ({casket.model}) at {casket.location.name}."
        )
        broadcast_event('casket.updated', {'id': casket.id, 'casket_id': casket.casket_id, 'status': casket.status})

    def perform_update(self, serializer):
        old_casket = self.get_object()
        old_status = old_casket.status
        casket = serializer.save()

        if old_status != casket.status:
            CasketTransaction.objects.create(
                casket=casket,
                action=CasketTransaction.Action.RESERVE if casket.status == 'RESERVED' else CasketTransaction.Action.USE,
                user=self.request.user,
                previous_status=old_status,
                new_status=casket.status,
                notes=f"Status updated from {old_status} to {casket.status}."
            )

        log_audit(
            self.request, 'UPDATE', 'CASKETS', casket.id, f"{casket.casket_id} - {casket.model}",
            f"Updated casket '{casket.casket_id}' ({casket.model})."
        )
        broadcast_event('casket.updated', {'id': casket.id, 'casket_id': casket.casket_id, 'status': casket.status})

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        casket = self.get_object()
        new_status = request.data.get('status')
        action_type = request.data.get('action', CasketTransaction.Action.RESERVE)
        deceased_name = request.data.get('deceased_name', '')
        contract_number = request.data.get('contract_number', '')
        notes = request.data.get('notes', '')

        if not new_status:
            return Response({'detail': 'New status is required.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = casket.status
        casket.status = new_status
        casket.save()

        tx = CasketTransaction.objects.create(
            casket=casket,
            action=action_type,
            user=request.user,
            previous_status=old_status,
            new_status=new_status,
            deceased_name=deceased_name,
            contract_number=contract_number,
            notes=notes
        )

        log_audit(
            request, 'STATUS_CHANGE', 'CASKETS', casket.id, casket.casket_id,
            f"Changed casket {casket.casket_id} status from {old_status} to {new_status}. {notes}",
            old_value={'status': old_status},
            new_value={'status': new_status}
        )

        broadcast_event('casket.updated', {
            'id': casket.id,
            'casket_id': casket.casket_id,
            'status': casket.status,
            'status_display': casket.get_status_display()
        })

        return Response({
            'detail': f"Casket status updated to {casket.get_status_display()}.",
            'casket': CasketSerializer(casket).data,
            'transaction': CasketTransactionSerializer(tx).data
        })
