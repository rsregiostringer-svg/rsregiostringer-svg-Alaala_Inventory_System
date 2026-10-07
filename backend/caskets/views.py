from django.db import models, transaction
from django.db.models import Q, Sum, Count, ProtectedError
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Casket, CasketTransaction, Buyer, Deceased, Chapel,
    CasketSale, LamayRecord, ChapelTurnover
)
from .serializers import (
    CasketSerializer, CasketTransactionSerializer,
    BuyerSerializer, DeceasedSerializer, ChapelSerializer,
    CasketSaleSerializer, LamayRecordSerializer, ChapelTurnoverSerializer
)
from core.audit import log_audit
from core.permissions import IsMasterAdmin
from alaala_backend.realtime import broadcast_event


class CasketViewSet(viewsets.ModelViewSet):
    queryset = Casket.objects.select_related('location').prefetch_related('history', 'sales').all()
    serializer_class = CasketSerializer

    def get_permissions(self):
        if self.action in ['destroy']:
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
        if not self.request.user.is_master_admin:
            loc_ids = self.request.user.get_accessible_location_ids()
            qs = qs.filter(location_id__in=loc_ids)

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
            # Extended search per Requirement 19:
            # Search by Casket ID, Model, Buyer, Deceased, Chapel, Service ID, Date Sold, Status
            qs = qs.filter(
                Q(casket_id__icontains=search) |
                Q(model__icontains=search) |
                Q(material__icontains=search) |
                Q(color__icontains=search) |
                Q(supplier__icontains=search) |
                Q(sales__buyer__full_name__icontains=search) |
                Q(sales__deceased__full_name__icontains=search) |
                Q(sales__chapel__name__icontains=search) |
                Q(sales__sale_id__icontains=search) |
                Q(history__deceased_name__icontains=search)
            ).distinct()
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

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def sell_or_assign(self, request, pk=None):
        """
        Requirements 2, 3, 12, 16, 17:
        Sell or Assign Casket form submission.
        Connects Casket -> Casket Sale -> Buyer -> Deceased -> Chapel Assignment -> Lamay Wake.
        """
        casket = self.get_object()

        # Check inventory quantity
        if casket.quantity <= 0:
            return Response(
                {'detail': f"Casket '{casket.casket_id}' is out of stock (Quantity: {casket.quantity})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data
        
        buyer_data = data.get('buyer') or {}
        deceased_data = data.get('deceased') or {}
        service_data = data.get('service') or {}

        # Buyer info
        buyer_name = (data.get('buyer_full_name') or buyer_data.get('full_name') or '').strip()
        buyer_address = (data.get('buyer_address') or buyer_data.get('address') or '').strip()
        buyer_contact = (data.get('buyer_contact') or buyer_data.get('contact_number') or '').strip()
        buyer_rel = (data.get('relationship_to_deceased') or buyer_data.get('relationship_to_deceased') or '').strip()
        # buyer_notes = (
        #     data.get('buyer_notes')
        #     or buyer_data.get('notes')
        #     or ''
        # ).strip()
        
        if not buyer_name:
            return Response(
                {'detail': 'Buyer name is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not buyer_address:
            return Response(
                {'detail': 'Buyer address is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not buyer_rel:
            return Response(
                {'detail': 'Buyer relationship to deceased is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # if not buyer_notes:
        #     return Response(
        #         {'detail': 'Buyer notes are required.'},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )
        if not buyer_contact:
            return Response(
                {'detail': 'Buyer contact number is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if(
            not buyer_contact.isdigit()
            or len(buyer_contact) !=11
            or not buyer_contact.startswith('09')
        ):
            return Response(
                {'detail': 'Buyer contact number must be exactly 11 digits and start with 09.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Deceased info
        deceased_name = (data.get('deceased_full_name') or deceased_data.get('full_name') or '').strip()
        date_of_death = deceased_data.get('date_of_death') or None
        age = deceased_data.get('age') or None
        sex = deceased_data.get('sex') or ''
        case_id = (deceased_data.get('funeral_case_id') or '').strip()
        deceased_notes = (deceased_data.get('notes') or '').strip()

        if not deceased_name:
            return Response({'detail': 'Deceased full name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Service info
        chapel_id = service_data.get('chapel') or None
        is_residence = bool(service_data.get('is_residence', False)) or (str(chapel_id).upper() in ['RESIDENCE', 'HOME', 'HOUSE'])
        residence_address = (service_data.get('residence_address') or buyer_address or '').strip()
        lamay_start_date = service_data.get('lamay_start_date') or timezone.now().date()
        lamay_start_time = service_data.get('lamay_start_time') or None
        expected_burial_date = service_data.get('expected_burial_date') or None
        burial_time = service_data.get('burial_time') or None
        service_status = service_data.get('service_status', 'ACTIVE')
        selling_price = data.get('selling_price') or casket.selling_price
        override_conflict = data.get('override_conflict', False)
        general_notes = data.get('notes', '')

        # Chapel Validation & Double Booking Prevention (Requirement 12)
        chapel = None
        if chapel_id and not is_residence:
            try:
                chapel = Chapel.objects.get(id=chapel_id)
            except (Chapel.DoesNotExist, ValueError):
                return Response({'detail': 'Selected chapel not found.'}, status=status.HTTP_404_NOT_FOUND)

            if service_status in ['ACTIVE', 'ACTIVE_LAMAY']:
                if chapel.available <= 0:
                    if not (request.user.is_master_admin and override_conflict):
                        active_lamays = chapel.lamay_records.filter(status__in=[
                            LamayRecord.Status.ARRANGEMENT,
                            LamayRecord.Status.RESERVED,
                            LamayRecord.Status.PREPARING,
                            LamayRecord.Status.ACTIVE,
                            LamayRecord.Status.READY_FOR_BURIAL,
                            LamayRecord.Status.FOR_BURIAL
                        ])
                        
                        names = ", ".join([l.deceased.full_name for l in active_lamays[:2]])
                        if active_lamays.count() > 2:
                            names += f" and {active_lamays.count() - 2} more"
                            
                        return Response({
                            'detail': (
                                f"CHAPEL UNAVAILABLE: {chapel.name} is at full capacity. "
                                f"Currently occupied by: {names}."
                            ),
                            'conflict': True,
                            'chapel_name': chapel.name,
                            'current_deceased': names,
                            'can_override': request.user.is_master_admin
                        }, status=status.HTTP_400_BAD_REQUEST)
        elif is_residence:
            chapel = None

        # 1. Create separate Buyer record
        buyer = Buyer.objects.create(
            full_name=buyer_name,
            contact_number=buyer_contact,
            address=buyer_address,
            relationship_to_deceased=buyer_rel,
            # notes=buyer_notes
        )

        # 2. Create separate Deceased record
        deceased = Deceased.objects.create(
            full_name=deceased_name,
            date_of_death=date_of_death,
            age=age if age else None,
            sex=sex,
            funeral_case_id=case_id,
            notes=deceased_notes
        )

        # 3. Generate Unique Sale ID
        today_str = timezone.now().strftime('%Y%m%d')
        sale_count = CasketSale.objects.filter(date_sold__date=timezone.now().date()).count() + 1
        sale_id = f"CS-{today_str}-{sale_count:04d}"

        # 4. Create CasketSale Record
        casket_sale = CasketSale.objects.create(
            sale_id=sale_id,
            casket=casket,
            buyer=buyer,
            deceased=deceased,
            chapel=chapel,
            is_residence=is_residence,
            residence_address=residence_address if is_residence else '',
            selling_price=selling_price,
            lamay_start_date=lamay_start_date,
            lamay_start_time=lamay_start_time,
            expected_burial_date=expected_burial_date,
            burial_time=burial_time,
            service_status='ACTIVE_LAMAY' if service_status in ['ACTIVE', 'ACTIVE_LAMAY'] else 'RESERVED',
            notes=general_notes,
            encoded_by=request.user
        )

        # 5. Create LamayRecord if chapel assigned or residence viewing
        lamay_record = None
        if chapel or is_residence:
            lamay_count = LamayRecord.objects.filter(created_at__date=timezone.now().date()).count() + 1
            lamay_id = f"LAMAY-{today_str}-{lamay_count:04d}"

            record_status = LamayRecord.Status.ACTIVE if service_status in ['ACTIVE', 'ACTIVE_LAMAY'] else LamayRecord.Status.RESERVED

            lamay_record = LamayRecord.objects.create(
                lamay_id=lamay_id,
                chapel=chapel,
                is_residence=is_residence,
                residence_address=residence_address if is_residence else '',
                deceased=deceased,
                buyer=buyer,
                casket=casket,
                casket_sale=casket_sale,
                funeral_case_id=case_id,
                lamay_start_date=lamay_start_date,
                lamay_start_time=lamay_start_time,
                expected_end_date=expected_burial_date,
                expected_burial_date=expected_burial_date,
                burial_time=burial_time,
                status=record_status,
                notes=general_notes,
                encoded_by=request.user
            )

            # Update Chapel Status automatically
            if chapel:
                if record_status == LamayRecord.Status.ACTIVE:
                    chapel.status = Chapel.Status.OCCUPIED
                    chapel.save()
                    broadcast_event('chapel.occupied', {
                        'chapel_id': chapel.id,
                        'chapel_name': chapel.name,
                        'status': chapel.status,
                        'deceased_name': deceased.full_name
                    })
                elif record_status == LamayRecord.Status.RESERVED and chapel.status == Chapel.Status.AVAILABLE:
                    chapel.status = Chapel.Status.RESERVED
                    chapel.save()
                    broadcast_event('chapel.updated', {
                        'chapel_id': chapel.id,
                        'chapel_name': chapel.name,
                        'status': chapel.status
                    })
            else:
                broadcast_event('lamay.started' if record_status == LamayRecord.Status.ACTIVE else 'lamay.created', {
                    'lamay_id': lamay_record.lamay_id,
                    'is_residence': True,
                    'residence_address': residence_address,
                    'deceased_name': deceased.full_name
                })

        # 6. Automatic Casket Inventory Update (Requirement 17)
        old_status = casket.status
        casket.quantity = max(0, casket.quantity - 1)
        if casket.quantity == 0:
            casket.status = Casket.Status.SOLD
        casket.save()

        # 7. Record Casket Transaction
        venue_text = f"Residence ({residence_address})" if is_residence else (chapel.name if chapel else 'No Chapel')
        CasketTransaction.objects.create(
            casket=casket,
            action=CasketTransaction.Action.SELL,
            user=request.user,
            previous_status=old_status,
            new_status=casket.status,
            deceased_name=deceased.full_name,
            contract_number=case_id or sale_id,
            notes=(
                f"Sold to {buyer.full_name} ({buyer.relationship_to_deceased}) for deceased {deceased.full_name}. "
                f"Assigned to {venue_text}. Remaining qty: {casket.quantity}."
            )
        )

        # 8. Record Audit Log
        log_audit(
            request, 'CASKET_SALE', 'CASKETS', casket.id, f"{casket.casket_id} - {casket.model}",
            f"Sold casket {casket.casket_id} to buyer '{buyer.full_name}' for deceased '{deceased.full_name}'. "
            f"Assigned to {chapel.name if chapel else 'None'}. Price: ₱{selling_price}.",
            old_value={'quantity': casket.quantity + 1, 'status': old_status},
            new_value={'quantity': casket.quantity, 'status': casket.status, 'sale_id': sale_id}
        )

        # 9. Realtime broadcast events (Requirement 23)
        broadcast_event('casket.sold', {
            'casket_id': casket.casket_id,
            'model': casket.model,
            'buyer': buyer.full_name,
            'deceased': deceased.full_name,
            'quantity': casket.quantity,
            'status': casket.status
        })
        broadcast_event('casket.updated', {
            'id': casket.id,
            'casket_id': casket.casket_id,
            'status': casket.status,
            'quantity': casket.quantity
        })
        if lamay_record:
            venue_label = chapel.name if chapel else (f"Residence ({lamay_record.residence_address})" if lamay_record.residence_address else 'Residence / Home Viewing')
            broadcast_event('lamay.created', {
                'lamay_id': lamay_record.lamay_id,
                'chapel': venue_label,
                'deceased': deceased.full_name,
                'status': lamay_record.status
            })

        return Response({
            'detail': f"Casket sale and service assignment recorded successfully. Sale ID: {sale_id}",
            'sale_id': sale_id,
            'casket': CasketSerializer(casket).data,
            'buyer': BuyerSerializer(buyer).data,
            'deceased': DeceasedSerializer(deceased).data,
            'lamay': LamayRecordSerializer(lamay_record).data if lamay_record else None
        }, status=status.HTTP_201_CREATED)


class BuyerViewSet(viewsets.ModelViewSet):
    queryset = Buyer.objects.all().order_by('-created_at')
    serializer_class = BuyerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(middle_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(full_name__icontains=search) |
                Q(contact_number__icontains=search) |
                Q(relationship_to_deceased__icontains=search) |
                Q(address__icontains=search)
            )
        return qs


class DeceasedViewSet(viewsets.ModelViewSet):
    queryset = Deceased.objects.all().order_by('-created_at')
    serializer_class = DeceasedSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(middle_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(full_name__icontains=search) |
                Q(funeral_case_id__icontains=search) |
                Q(notes__icontains=search)
            )
        return qs


class ChapelViewSet(viewsets.ModelViewSet):
    """
    Requirements 5, 6, 9, 11, 15:
    Chapel monitoring and configuration.
    """
    queryset = Chapel.objects.select_related('location').all().order_by('name')
    serializer_class = ChapelSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsMasterAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        from django.utils import timezone
        import datetime
        from alaala_backend.realtime import broadcast_event

        now = timezone.localtime()
        active_lamays = LamayRecord.objects.filter(status=LamayRecord.Status.ACTIVE)
        for lamay in active_lamays:
            if lamay.expected_end_date and lamay.expected_end_time:
                # Use make_aware but handle timezones carefully
                dt_naive = datetime.datetime.combine(lamay.expected_end_date, lamay.expected_end_time)
                if timezone.is_aware(now):
                    dt = timezone.make_aware(dt_naive)
                else:
                    dt = dt_naive

                if now >= dt:
                    lamay.status = LamayRecord.Status.COMPLETED
                    lamay.save()
                    if lamay.chapel:
                        chapel = lamay.chapel
                        chapel.status = Chapel.Status.AVAILABLE
                        chapel.save()
                        broadcast_event('lamay.updated', {'lamay_id': lamay.lamay_id, 'status': lamay.status})
                        broadcast_event('chapel.updated', {'id': chapel.id, 'name': chapel.name, 'status': chapel.status})

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        chapel = serializer.save()
        log_audit(self.request, 'CREATE', 'CHAPELS', chapel.id, chapel.name, f"Created chapel '{chapel.name}' ({chapel.code})")
        broadcast_event('chapel.updated', {'id': chapel.id, 'name': chapel.name, 'status': chapel.status})

    def perform_update(self, serializer):
        chapel = serializer.save()
        log_audit(self.request, 'UPDATE', 'CHAPELS', chapel.id, chapel.name, f"Updated chapel '{chapel.name}'")
        broadcast_event('chapel.updated', {'id': chapel.id, 'name': chapel.name, 'status': chapel.status})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        active = instance.get_active_lamay()
        if active:
            return Response(
                {'detail': f"Cannot delete '{instance.name}' because it currently has an active lamay for {active.deceased.full_name}. Please complete or transfer the service first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            name = instance.name
            uid = instance.id
            instance.delete()
            log_audit(request, 'DELETE', 'CHAPELS', uid, name, f"Deleted chapel '{name}'")
            broadcast_event('chapel.updated', {'id': uid, 'deleted': True})
            return Response({'detail': f"Chapel '{name}' deleted successfully."}, status=status.HTTP_200_OK)
        except ProtectedError:
            instance.is_active = False
            instance.status = Chapel.Status.OUT_OF_SERVICE
            instance.save()
            log_audit(request, 'DEACTIVATE', 'CHAPELS', instance.id, instance.name, f"Deactivated chapel '{instance.name}' (historical records preserved).")
            broadcast_event('chapel.updated', {'id': instance.id, 'is_active': False})
            return Response({'detail': f"Chapel '{instance.name}' has historical service records and was safely deactivated/marked Out of Service."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def availability_summary(self, request):
        """
        Requirement 11:
        Immediately show Total Chapels, Available, Occupied, Reserved, Cleaning, Maintenance.
        """
        chapels = Chapel.objects.filter(is_active=True)
        total = chapels.count()
        available = chapels.filter(status=Chapel.Status.AVAILABLE).count()
        occupied = chapels.filter(status=Chapel.Status.OCCUPIED).count()
        reserved = chapels.filter(status=Chapel.Status.RESERVED).count()
        cleaning = chapels.filter(status=Chapel.Status.CLEANING).count()
        maintenance = chapels.filter(status=Chapel.Status.MAINTENANCE).count()
        out_of_service = chapels.filter(status=Chapel.Status.OUT_OF_SERVICE).count()

        return Response({
            'total_chapels': total,
            'available': available,
            'occupied': occupied,
            'reserved': reserved,
            'cleaning': cleaning,
            'maintenance': maintenance,
            'out_of_service': out_of_service
        })

    @action(
        detail = True,
        methods = ['post'],
        url_path = 'turnover_checklist',
        url_name = 'turnover-checklist'
    )
    @transaction.atomic
    def turnover(self, request, pk=None):
        chapel = self.get_object()
        data = request.data

        # 9 items
        casket_removed = bool(data.get('casket_removed', False))
        chairs_arranged = bool(data.get('chairs_arranged', False))
        tables_cleaned = bool(data.get('tables_cleaned', False))
        floor_cleaned = bool(data.get('floor_cleaned', False))
        bathroom_checked = bool(data.get('bathroom_checked', False))
        trash_removed = bool(data.get('trash_removed', False))
        equipment_checked = bool(data.get('equipment_checked', False))
        inventory_checked = bool(data.get('inventory_checked', False))
        chapel_ready = bool(data.get('chapel_ready', False))

        notes = data.get('notes', '')
        deceased_name = data.get('deceased_name', '')

        # Check latest completed lamay if deceased_name not passed
        if not deceased_name:
            last_lamay = chapel.lamay_records.filter(status=LamayRecord.Status.COMPLETED).order_by('-updated_at').first()
            if last_lamay:
                deceased_name = last_lamay.deceased.full_name

        turnover = ChapelTurnover.objects.create(
            chapel=chapel,
            deceased_name=deceased_name,
            casket_removed=casket_removed,
            chairs_arranged=chairs_arranged,
            tables_cleaned=tables_cleaned,
            floor_cleaned=floor_cleaned,
            bathroom_checked=bathroom_checked,
            trash_removed=trash_removed,
            equipment_checked=equipment_checked,
            inventory_checked=inventory_checked,
            chapel_ready=chapel_ready,
            notes=notes,
            checked_by=request.user,
            checked_by_name=request.user.get_full_name() or request.user.username
        )

        all_passed = turnover.is_all_checked
        old_status = chapel.status
        if all_passed:
            chapel.status = Chapel.Status.AVAILABLE
            chapel.save()

            log_audit(
                request, 'CHAPEL_TURNOVER', 'CHAPELS', chapel.id, chapel.name,
                f"Chapel '{chapel.name}' turnover checklist verified complete by {request.user.username}. Chapel marked AVAILABLE.",
                old_value={'status': old_status},
                new_value={'status': chapel.status}
            )

            broadcast_event('chapel.available', {
                'chapel_id': chapel.id,
                'name': chapel.name,
                'status': chapel.status
            })
            broadcast_event('chapel.updated', {
                'chapel_id': chapel.id,
                'name': chapel.name,
                'status': chapel.status
            })

            return Response({
                'detail': f"Turnover inspection complete. {chapel.name} is now AVAILABLE for new services.",
                'chapel': ChapelSerializer(chapel).data,
                'turnover': ChapelTurnoverSerializer(turnover).data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': "Checklist recorded, but not all 9 required items were verified. Chapel remains in CLEANING status until all items are completed.",
                'chapel': ChapelSerializer(chapel).data,
                'turnover': ChapelTurnoverSerializer(turnover).data
            }, status=status.HTTP_200_OK)


class LamayRecordViewSet(viewsets.ModelViewSet):
    """
    Lamay / Wake Record monitoring and service lifecycle.
    """
    queryset = LamayRecord.objects.select_related(
        'chapel', 'deceased', 'buyer', 'casket', 'casket_sale', 'encoded_by'
    ).all().order_by('-lamay_start_date', '-created_at')
    serializer_class = LamayRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        chapel_id = self.request.query_params.get('chapel')
        status_filter = self.request.query_params.get('status')
        deceased_search = self.request.query_params.get('deceased')
        buyer_search = self.request.query_params.get('buyer')
        search = self.request.query_params.get('search')
        start_date = self.request.query_params.get('start_date')
        expected_burial = self.request.query_params.get('expected_burial')
        contact_search = self.request.query_params.get('contact')

        if chapel_id:
            qs = qs.filter(chapel_id=chapel_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if deceased_search:
            qs = qs.filter(deceased__full_name__icontains=deceased_search)
        if buyer_search:
            qs = qs.filter(buyer__full_name__icontains=buyer_search)
        if contact_search:
            qs = qs.filter(buyer__contact_number__icontains=contact_search)
        if start_date:
            qs = qs.filter(lamay_start_date__gte=start_date)
        if expected_burial:
            qs = qs.filter(expected_burial_date__lte=expected_burial)
        if search:
            qs = qs.filter(
                Q(lamay_id__icontains=search) |
                Q(deceased__full_name__icontains=search) |
                Q(buyer__full_name__icontains=search) |
                Q(buyer__contact_number__icontains=search) |
                Q(chapel__name__icontains=search) |
                Q(casket__casket_id__icontains=search) |
                Q(casket__model__icontains=search) |
                Q(funeral_case_id__icontains=search) |
                Q(residence_address__icontains=search) |
                Q(notes__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        lamay = serializer.save(encoded_by=self.request.user)
        log_audit(
            self.request, 'CREATE', 'LAMAY', lamay.id, lamay.lamay_id,
            f"Created Lamay record '{lamay.lamay_id}' for {lamay.deceased.full_name}."
        )
        broadcast_event('lamay.created', {
            'lamay_id': lamay.lamay_id,
            'deceased': lamay.deceased.full_name,
            'status': lamay.status
        })

    def perform_update(self, serializer):
        old = self.get_object()
        old_status = old.status
        lamay = serializer.save()
        if old_status != lamay.status:
            log_audit(
                self.request, 'STATUS_CHANGE', 'LAMAY', lamay.id, lamay.lamay_id,
                f"Status changed from {old_status} to {lamay.status}.",
                old_value={'status': old_status},
                new_value={'status': lamay.status}
            )
        else:
            log_audit(
                self.request, 'UPDATE', 'LAMAY', lamay.id, lamay.lamay_id,
                f"Updated Lamay record '{lamay.lamay_id}'."
            )
        broadcast_event('lamay.updated', {'lamay_id': lamay.lamay_id, 'status': lamay.status})

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update lamay status and optionally update chapel status."""
        lamay = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'detail': 'Status is required.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = lamay.status
        lamay.status = new_status
        lamay.save()

        # Auto-update chapel status
        chapel = lamay.chapel
        if chapel:
            if new_status == LamayRecord.Status.ACTIVE:
                chapel.status = Chapel.Status.OCCUPIED
                chapel.save()
            elif new_status in [LamayRecord.Status.COMPLETED, LamayRecord.Status.CANCELLED]:
                chapel.status = Chapel.Status.CLEANING if new_status == LamayRecord.Status.COMPLETED else Chapel.Status.AVAILABLE
                chapel.save()
            broadcast_event('chapel.updated', {'chapel_id': chapel.id, 'status': chapel.status})

        log_audit(
            request, 'STATUS_CHANGE', 'LAMAY', lamay.id, lamay.lamay_id,
            f"Lamay status changed from {old_status} to {new_status}.",
            old_value={'status': old_status}, new_value={'status': new_status}
        )
        broadcast_event('lamay.updated', {'lamay_id': lamay.lamay_id, 'status': lamay.status})

        return Response({
            'detail': f"Lamay status updated to {lamay.get_status_display()}.",
            'lamay': LamayRecordSerializer(lamay).data
        })

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def create_direct(self, request):
        """
        Create a Lamay record directly with new or existing buyer/deceased.
        Handles all structured name fields and PH phone number validation.
        """
        data = request.data
        deceased_data = data.get('deceased', {})
        buyer_data = data.get('buyer', {})
        service_data = data.get('service', {})

        # ---- DECEASED ----
        deceased_id = deceased_data.get('id')
        if deceased_id:
            try:
                deceased = Deceased.objects.get(id=deceased_id)
            except Deceased.DoesNotExist:
                return Response({'detail': 'Deceased record not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            first = (deceased_data.get('first_name') or '').strip()
            last = (deceased_data.get('last_name') or '').strip()
            if not first or not last:
                return Response({'detail': 'Deceased first name and last name are required.'}, status=status.HTTP_400_BAD_REQUEST)
            deceased = Deceased.objects.create(
                first_name=first,
                middle_name=(deceased_data.get('middle_name') or '').strip(),
                last_name=last,
                suffix=(deceased_data.get('suffix') or '').strip(),
                date_of_birth=deceased_data.get('date_of_birth') or None,
                date_of_death=deceased_data.get('date_of_death') or None,
                age=deceased_data.get('age') or None,
                sex=(deceased_data.get('sex') or '').strip(),
                address=(deceased_data.get('address') or '').strip(),
                cause_of_death=(deceased_data.get('cause_of_death') or '').strip(),
                funeral_case_id=(deceased_data.get('funeral_case_id') or '').strip(),
                notes=(deceased_data.get('notes') or '').strip(),
            )

        # ---- BUYER ----
        buyer_id = buyer_data.get('id')
        if buyer_id:
            try:
                buyer = Buyer.objects.get(id=buyer_id)
            except Buyer.DoesNotExist:
                return Response({'detail': 'Buyer/Client record not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            b_first = (buyer_data.get('first_name') or '').strip()
            b_last = (buyer_data.get('last_name') or '').strip()
            b_contact = (buyer_data.get('contact_number') or '').strip()

            if not b_first or not b_last:
                return Response({'detail': 'Buyer first name and last name are required.'}, status=status.HTTP_400_BAD_REQUEST)
            if not b_contact:
                return Response({'detail': 'Buyer contact number is required.'}, status=status.HTTP_400_BAD_REQUEST)

            import re
            if not re.match(r'^09[0-9]{9}$', b_contact):
                return Response({'detail': 'Contact number must be exactly 11 digits and start with 09 (e.g. 09171234567).'}, status=status.HTTP_400_BAD_REQUEST)

            buyer = Buyer.objects.create(
                first_name=b_first,
                middle_name=(buyer_data.get('middle_name') or '').strip(),
                last_name=b_last,
                contact_number=b_contact,
                address=(buyer_data.get('address') or '').strip(),
                relationship_to_deceased=(buyer_data.get('relationship_to_deceased') or '').strip(),
                relationship_other=(buyer_data.get('relationship_other') or '').strip(),
                notes=(buyer_data.get('notes') or '').strip(),
            )

        # ---- CASKET ----
        casket_id = service_data.get('casket')
        casket = None
        if casket_id:
            try:
                casket = Casket.objects.get(id=casket_id)
            except Casket.DoesNotExist:
                return Response({'detail': 'Selected casket not found.'}, status=status.HTTP_404_NOT_FOUND)

        # ---- CHAPEL ----
        chapel_id = service_data.get('chapel')
        chapel = None
        if chapel_id:
            try:
                chapel = Chapel.objects.get(id=chapel_id)
            except Chapel.DoesNotExist:
                return Response({'detail': 'Selected chapel not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Double-booking prevention
            svc_status = service_data.get('status', LamayRecord.Status.ACTIVE)
            if svc_status == LamayRecord.Status.ACTIVE:
                active = chapel.get_active_lamay()
                if active:
                    override = request.data.get('override_conflict', False)
                    if not (request.user.is_master_admin and override):
                        burial_str = active.expected_burial_date.strftime('%B %d, %Y') if active.expected_burial_date else 'TBD'
                        return Response({
                            'detail': f"CHAPEL UNAVAILABLE: {chapel.name} is currently occupied by an active lamay for {active.deceased.full_name} (Expected Burial: {burial_str}).",
                            'conflict': True,
                            'can_override': request.user.is_master_admin
                        }, status=status.HTTP_400_BAD_REQUEST)

        # ---- LAMAY ID ----
        today_str = timezone.now().strftime('%Y%m%d')
        lamay_count = LamayRecord.objects.filter(created_at__date=timezone.now().date()).count() + 1
        lamay_id_str = f"L-{today_str}-{lamay_count:04d}"

        wake_loc = service_data.get('wake_location', 'ALAALA')
        is_residence = wake_loc == 'RESIDENCE'
        residence_address = (service_data.get('residence_address') or '').strip()

        record_status = service_data.get('status', LamayRecord.Status.ACTIVE)
        lamay = LamayRecord.objects.create(
            lamay_id=lamay_id_str,
            chapel=chapel,
            wake_location=wake_loc,
            is_residence=is_residence,
            residence_address=residence_address if is_residence else '',
            deceased=deceased,
            buyer=buyer,
            casket=casket,
            funeral_case_id=(service_data.get('funeral_case_id') or '').strip(),
            lamay_start_date=service_data.get('lamay_start_date') or timezone.now().date(),
            lamay_start_time=service_data.get('lamay_start_time') or None,
            expected_end_date=service_data.get('expected_end_date') or None,
            expected_end_time=service_data.get('expected_end_time') or None,
            expected_burial_date=service_data.get('expected_burial_date') or None,
            burial_time=service_data.get('burial_time') or None,
            assigned_staff=(service_data.get('assigned_staff') or '').strip(),
            service_type=(service_data.get('service_type') or '').strip(),
            discount=service_data.get('discount') or 0.00,
            status=record_status,
            notes=(data.get('notes') or '').strip(),
            encoded_by=request.user,
        )

        # Update chapel status if active
        if chapel and record_status == LamayRecord.Status.ACTIVE:
            chapel.status = Chapel.Status.OCCUPIED
            chapel.save()
            broadcast_event('chapel.occupied', {'chapel_id': chapel.id, 'chapel_name': chapel.name, 'status': chapel.status})

        # Mark casket as sold if provided and active
        if casket and record_status == LamayRecord.Status.ACTIVE:
            old_casket_status = casket.status
            casket.quantity = max(0, casket.quantity - 1)
            if casket.quantity == 0:
                casket.status = Casket.Status.SOLD
            casket.save()
            CasketTransaction.objects.create(
                casket=casket,
                action=CasketTransaction.Action.SELL,
                user=request.user,
                previous_status=old_casket_status,
                new_status=casket.status,
                deceased_name=deceased.full_name,
                contract_number=lamay_id_str,
                notes=f"Assigned to Lamay {lamay_id_str} for {deceased.full_name}."
            )
            broadcast_event('casket.updated', {'id': casket.id, 'casket_id': casket.casket_id, 'status': casket.status})

        log_audit(
            request, 'CREATE', 'LAMAY', lamay.id, lamay.lamay_id,
            f"Created Lamay record '{lamay.lamay_id}' for {deceased.full_name}. Buyer: {buyer.full_name}. Chapel: {chapel.name if chapel else 'N/A'}."
        )
        broadcast_event('lamay.created', {'lamay_id': lamay.lamay_id, 'deceased': deceased.full_name, 'status': lamay.status})

        return Response({
            'detail': f"Lamay record {lamay_id_str} created successfully.",
            'lamay': LamayRecordSerializer(lamay).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Quick stats for Lamay dashboard cards."""
        now = timezone.now()
        qs = self.get_queryset()
        active = qs.filter(status=LamayRecord.Status.ACTIVE).count()
        arrangement = qs.filter(status=LamayRecord.Status.ARRANGEMENT).count()
        ready = qs.filter(status=LamayRecord.Status.READY_FOR_BURIAL).count()
        completed_month = qs.filter(
            status=LamayRecord.Status.COMPLETED,
            updated_at__year=now.year,
            updated_at__month=now.month
        ).count()
        return Response({
            'active_wake': active,
            'arrangement': arrangement,
            'ready_for_burial': ready,
            'completed_this_month': completed_month,
        })

    @action(detail=False, methods=['get'])
    def currently_having_lamay(self, request):
        """
        Requirements 10 & 20 & 22:
        Answers 'Who is currently having lamay?' / 'May lamay ba ngayon?'
        Returns list of active lamay records.
        """
        active_lamays = self.get_queryset().filter(status=LamayRecord.Status.ACTIVE)
        serializer = self.get_serializer(active_lamays, many=True)
        return Response({
            'count': active_lamays.count(),
            'active_services': serializer.data
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def start_lamay(self, request, pk=None):
        """
        Requirement 8:
        When a lamay becomes ACTIVE / LAMAY, assigned chapel becomes OCCUPIED / LAMAY.
        If residence viewing, starts vigil directly.
        """
        lamay = self.get_object()
        chapel = lamay.chapel

        if chapel:
            # Check conflict
            active_in_chapel = chapel.get_active_lamay()
            if active_in_chapel and active_in_chapel.id != lamay.id:
                return Response({
                    'detail': f"Chapel {chapel.name} already has an active lamay for {active_in_chapel.deceased.full_name}."
                }, status=status.HTTP_400_BAD_REQUEST)

            chapel.status = Chapel.Status.OCCUPIED
            chapel.save()

        old_status = lamay.status
        lamay.status = LamayRecord.Status.ACTIVE
        lamay.save()

        venue_name = chapel.name if chapel else (f"Residence ({lamay.residence_address})" if lamay.residence_address else 'Residence / Home Viewing')
        log_audit(
            request, 'LAMAY_START', 'CHAPELS' if chapel else 'LAMAY', lamay.id, lamay.lamay_id,
            f"Started lamay for {lamay.deceased.full_name} at {venue_name}.",
            old_value={'status': old_status},
            new_value={'status': lamay.status}
        )

        broadcast_event('lamay.started', {
            'lamay_id': lamay.lamay_id,
            'chapel': venue_name,
            'deceased': lamay.deceased.full_name
        })
        if chapel:
            broadcast_event('chapel.occupied', {
                'chapel_id': chapel.id,
                'chapel_name': chapel.name,
                'status': chapel.status,
                'deceased': lamay.deceased.full_name
            })

        return Response({
            'detail': f"Lamay service started at {venue_name}.",
            'lamay': LamayRecordSerializer(lamay).data,
            'chapel': ChapelSerializer(chapel).data if chapel else None
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def complete_service(self, request, pk=None):
        """
        Requirement 8 & 14:
        When deceased leaves for burial:
        Lamay Status -> COMPLETED
        Chapel Status -> CLEANING (if chapel, requires Turnover checklist to return to AVAILABLE)
        If residence, completed directly.
        """
        lamay = self.get_object()
        chapel = lamay.chapel

        old_lamay_status = lamay.status
        lamay.status = LamayRecord.Status.COMPLETED
        lamay.save()

        if chapel:
            chapel.status = Chapel.Status.CLEANING
            chapel.save()
            broadcast_event('chapel.updated', {
                'chapel_id': chapel.id,
                'chapel_name': chapel.name,
                'status': chapel.status
            })

        venue_name = chapel.name if chapel else (f"Residence ({lamay.residence_address})" if lamay.residence_address else 'Residence / Home Viewing')
        log_audit(
            request, 'LAMAY_COMPLETED', 'CHAPELS' if chapel else 'LAMAY', lamay.id, lamay.lamay_id,
            f"Completed lamay service for {lamay.deceased.full_name} ({venue_name}).",
            old_value={'status': old_lamay_status},
            new_value={'status': lamay.status, 'chapel_status': chapel.status if chapel else 'N/A'}
        )

        broadcast_event('lamay.completed', {
            'lamay_id': lamay.lamay_id,
            'chapel': venue_name,
            'deceased': lamay.deceased.full_name
        })

        detail_msg = (
            f"Service for {lamay.deceased.full_name} marked COMPLETED. "
            f"{chapel.name} has been set to CLEANING status. Please complete the Chapel Turnover checklist to make it AVAILABLE."
            if chapel else
            f"Residence wake service for {lamay.deceased.full_name} has been marked COMPLETED."
        )

        return Response({
            'detail': detail_msg,
            'lamay': LamayRecordSerializer(lamay).data,
            'chapel': ChapelSerializer(chapel).data if chapel else None
        })

    def perform_destroy(self, instance):
        chapel = instance.chapel
        if chapel and instance.status == LamayRecord.Status.ACTIVE:
            chapel.status = Chapel.Status.AVAILABLE
            chapel.save()
            broadcast_event('chapel.available', {'chapel_id': chapel.id, 'status': chapel.status})
        uid = instance.id
        lamay_id = instance.lamay_id
        instance.delete()
        log_audit(self.request, 'DELETE', 'LAMAY', uid, lamay_id, f"Deleted lamay record '{lamay_id}'")
        broadcast_event('lamay.deleted', {'id': uid, 'lamay_id': lamay_id})


class CasketSaleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Requirements 2, 18, 19:
    Casket Sale / Usage records history and searchability.
    """
    queryset = CasketSale.objects.select_related(
        'casket', 'buyer', 'deceased', 'chapel', 'encoded_by'
    ).all().order_by('-date_sold')
    serializer_class = CasketSaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        chapel_id = self.request.query_params.get('chapel')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if chapel_id:
            qs = qs.filter(chapel_id=chapel_id)
        if start_date:
            qs = qs.filter(date_sold__date__gte=start_date)
        if end_date:
            qs = qs.filter(date_sold__date__lte=end_date)
        if search:
            qs = qs.filter(
                Q(sale_id__icontains=search) |
                Q(casket__casket_id__icontains=search) |
                Q(casket__model__icontains=search) |
                Q(buyer__full_name__icontains=search) |
                Q(buyer__contact_number__icontains=search) |
                Q(deceased__full_name__icontains=search) |
                Q(chapel__name__icontains=search) |
                Q(notes__icontains=search)
            )
        return qs
