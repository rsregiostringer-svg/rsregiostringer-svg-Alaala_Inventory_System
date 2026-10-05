import datetime
from rest_framework import viewsets, permissions, parsers
from django.db.models import Q
from .models import Maintenance
from .serializers import MaintenanceSerializer
from core.audit import log_audit
from core.permissions import IsMasterAdmin
from alaala_backend.realtime import broadcast_event


class MaintenanceViewSet(viewsets.ModelViewSet):
    queryset = Maintenance.objects.select_related('location').all()
    serializer_class = MaintenanceSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsMasterAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_destroy(self, instance):
        uid = instance.id
        mid = instance.maintenance_id
        instance.delete()
        log_audit(self.request, 'DELETE', 'MAINTENANCE', uid, mid, f"Deleted maintenance ticket '{mid}'")
        broadcast_event('maintenance.deleted', {'id': uid, 'maintenance_id': mid})

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_master_admin:
            loc_ids = self.request.user.get_accessible_location_ids()
            qs = qs.filter(location_id__in=loc_ids)

        location_id = self.request.query_params.get('location')
        category = self.request.query_params.get('category')
        priority = self.request.query_params.get('priority')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        is_open = self.request.query_params.get('is_open')

        if location_id:
            qs = qs.filter(location_id=location_id)
        if category:
            qs = qs.filter(category=category)
        if priority:
            qs = qs.filter(priority=priority)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if is_open and is_open.lower() in ('true', '1'):
            qs = qs.filter(status__in=['REPORTED', 'PENDING', 'FOR_REPAIR', 'IN_PROGRESS'])
        if search:
            qs = qs.filter(
                Q(maintenance_id__icontains=search) |
                Q(issue__icontains=search) |
                Q(description__icontains=search) |
                Q(assigned_to__icontains=search) |
                Q(reported_by__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        # Auto-generate maintenance_id if not present
        maintenance_id = serializer.validated_data.get('maintenance_id')
        if not maintenance_id:
            today_str = datetime.date.today().strftime('%Y%m%d')
            count = Maintenance.objects.filter(maintenance_id__startswith=f"MNT-{today_str}").count() + 1
            maintenance_id = f"MNT-{today_str}-{count:03d}"
            record = serializer.save(maintenance_id=maintenance_id)
        else:
            record = serializer.save()

        log_audit(
            self.request, 'CREATE', 'MAINTENANCE', record.id, record.maintenance_id,
            f"Logged maintenance request '{record.maintenance_id}': {record.issue} at {record.location.name} (Priority: {record.priority})"
        )
        broadcast_event('maintenance.updated', {
            'id': record.id,
            'maintenance_id': record.maintenance_id,
            'status': record.status,
            'priority': record.priority,
            'location': record.location.name
        })

    def perform_update(self, serializer):
        old_record = self.get_object()
        old_status = old_record.status
        record = serializer.save()

        log_audit(
            self.request, 'UPDATE', 'MAINTENANCE', record.id, record.maintenance_id,
            f"Updated maintenance ticket '{record.maintenance_id}'. Status: {record.status}.",
            old_value={'status': old_status, 'cost': float(old_record.cost)},
            new_value={'status': record.status, 'cost': float(record.cost)}
        )
        broadcast_event('maintenance.updated', {
            'id': record.id,
            'maintenance_id': record.maintenance_id,
            'status': record.status,
            'priority': record.priority,
            'location': record.location.name
        })
