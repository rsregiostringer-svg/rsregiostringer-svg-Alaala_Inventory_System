from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import LaundryRecord
from .serializers import LaundryRecordSerializer
from core.audit import log_audit
from alaala_backend.realtime import broadcast_event


class LaundryViewSet(viewsets.ModelViewSet):
    queryset = LaundryRecord.objects.select_related('location').all()
    serializer_class = LaundryRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get('location')
        status_filter = self.request.query_params.get('status')
        in_charge = self.request.query_params.get('in_charge')
        search = self.request.query_params.get('search')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if location_id:
            qs = qs.filter(location_id=location_id)
        if status_filter:
            if status_filter == 'IN_PROCESS':
                qs = qs.exclude(status='RETURNED')
            else:
                qs = qs.filter(status=status_filter)
        if in_charge:
            qs = qs.filter(
                Q(laundry_in_charge__icontains=in_charge) |
                Q(laba_in_charge__icontains=in_charge) |
                Q(banlaw_in_charge__icontains=in_charge) |
                Q(sampay_in_charge__icontains=in_charge) |
                Q(pinaw_in_charge__icontains=in_charge) |
                Q(tiklop_in_charge__icontains=in_charge) |
                Q(returned_by__icontains=in_charge)
            )
        if search:
            qs = qs.filter(
                Q(item__icontains=search) |
                Q(encoded_by__icontains=search) |
                Q(notes__icontains=search)
            )
        if start_date:
            qs = qs.filter(laundry_in_date__gte=start_date)
        if end_date:
            qs = qs.filter(laundry_in_date__lte=end_date)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        encoded_by = serializer.validated_data.get('encoded_by') or (user.get_full_name() or user.username)
        record = serializer.save(encoded_by=encoded_by)
        
        log_audit(
            self.request, 'CREATE', 'LAUNDRY', record.id, f"{record.item} (Qty: {record.quantity})",
            f"Created laundry batch #{record.id} ({record.item}, Qty: {record.quantity}) at {record.location.name}. Encoded by {encoded_by}."
        )
        broadcast_event('laundry.created', {
            'id': record.id,
            'item': record.item,
            'quantity': record.quantity,
            'location': record.location.name,
            'status': record.status,
            'status_display': record.get_status_display()
        })

    def perform_update(self, serializer):
        old_record = self.get_object()
        old_stage_status = old_record.status
        record = serializer.save()

        # Audit accountability
        log_audit(
            self.request, 'UPDATE', 'LAUNDRY', record.id, f"{record.item} (Qty: {record.quantity})",
            f"Updated laundry record #{record.id}. Status changed from {old_stage_status} to {record.status}.",
            old_value={'status': old_stage_status},
            new_value={'status': record.status}
        )

        event_name = 'laundry.returned' if record.status == 'RETURNED' else 'laundry.stage.updated'
        broadcast_event(event_name, {
            'id': record.id,
            'item': record.item,
            'status': record.status,
            'status_display': record.get_status_display(),
            'location': record.location.name
        })

    @action(detail=True, methods=['post'])
    def advance_stage(self, request, pk=None):
        record = self.get_object()
        stage = request.data.get('stage')  # 'laba', 'banlaw', 'sampay', 'pinaw', 'tiklop', 'return'
        date_val = request.data.get('date')
        shift_val = request.data.get('shift', '8am to 5pm')
        in_charge_val = request.data.get('in_charge', '')

        if not stage or not date_val or not in_charge_val:
            return Response(
                {'detail': 'stage, date, and in_charge are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stage = stage.lower()
        if stage == 'laba':
            record.laba_date = date_val
            record.laba_shift = shift_val
            record.laba_in_charge = in_charge_val
        elif stage == 'banlaw':
            record.banlaw_date = date_val
            record.banlaw_shift = shift_val
            record.banlaw_in_charge = in_charge_val
        elif stage == 'sampay':
            record.sampay_date = date_val
            record.sampay_shift = shift_val
            record.sampay_in_charge = in_charge_val
        elif stage == 'pinaw':
            record.pinaw_date = date_val
            record.pinaw_shift = shift_val
            record.pinaw_in_charge = in_charge_val
        elif stage == 'tiklop':
            record.tiklop_date = date_val
            record.tiklop_shift = shift_val
            record.tiklop_in_charge = in_charge_val
        elif stage == 'return':
            record.date_returned = date_val
            record.returned_by = in_charge_val
        else:
            return Response({'detail': f"Unknown stage: {stage}"}, status=status.HTTP_400_BAD_REQUEST)

        record.save()

        log_audit(
            request, 'STAGE_CHANGE', 'LAUNDRY', record.id, f"{record.item} (Qty: {record.quantity})",
            f"Completed stage '{stage.upper()}' for Laundry #{record.id} by {in_charge_val} (Shift: {shift_val}, Date: {date_val})."
        )

        broadcast_event('laundry.stage.updated', {
            'id': record.id,
            'item': record.item,
            'stage': stage,
            'status': record.status,
            'status_display': record.get_status_display()
        })

        return Response({
            'detail': f"Successfully completed {stage.upper()} stage.",
            'record': LaundryRecordSerializer(record).data
        })
