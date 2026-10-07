import datetime
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
from caskets.models import Deceased, LamayRecord, Chapel
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q, Avg, F
from .models import User, Location, AuditLog, SystemSetting
from .serializers import (
    UserSerializer, UserCreateUpdateSerializer, UserProfileSerializer,
    LocationSerializer, AuditLogSerializer
)
from .permissions import (
    IsMasterAdmin, IsSimpleAdmin, IsStaff, CanManageUsers,
    CanViewAuditLogs, CanViewReports, CanViewAnalytics, CanManageSettings,
    CanManageLocations, CanManageShifts, CanAccessWater, CanAccessElectricity
)
from .audit import log_audit


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {'detail': 'Invalid credentials. Please verify your username and password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active or user.status == User.Status.INACTIVE:
            return Response(
                {'detail': 'User account has been deactivated.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if user.status == User.Status.SUSPENDED:
            return Response(
                {'detail': 'User account is currently suspended. Please contact the Master Admin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)
        log_audit(
            request=request,
            action='LOGIN',
            module='AUTH',
            record_id=user.id,
            record_repr=user.username,
            description=f"User {user.username} logged in successfully."
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit(request, 'UPDATE', 'AUTH', user.id, user.username, f"User {user.username} updated profile details.")
        return Response({
            'detail': 'Profile updated successfully.',
            'user': UserSerializer(user).data
        })

    def patch(self, request):
        return self.put(request)


class ChangePasswordView(APIView):
    permission_classes = [IsMasterAdmin]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'detail': 'Both old and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'detail': 'Incorrect old password.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'detail': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        log_audit(request, 'UPDATE', 'AUTH', user.id, user.username, f"User {user.username} changed their password.")
        return Response({'detail': 'Password updated successfully.'})


class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanManageLocations()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Location.objects.all().order_by('name')
        if not self.request.user.is_master_admin:
            # If user has specifically assigned locations, constrain to them
            if self.request.user.assigned_locations.exists() or self.request.user.location_id:
                loc_ids = self.request.user.get_accessible_location_ids()
                qs = qs.filter(id__in=loc_ids)
        return qs

    def perform_create(self, serializer):
        loc = serializer.save()
        log_audit(self.request, 'CREATE', 'LOCATIONS', loc.id, loc.name, f"Created location '{loc.name}'")

    def perform_update(self, serializer):
        loc = serializer.save()
        log_audit(self.request, 'UPDATE', 'LOCATIONS', loc.id, loc.name, f"Updated location '{loc.name}'")

    def perform_destroy(self, instance):
        uid = instance.id
        name = instance.name
        instance.delete()
        log_audit(self.request, 'DELETE', 'LOCATIONS', uid, name, f"Deleted location '{name}'")


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    pagination_class = None
    permission_classes = [CanManageUsers]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit(self.request, 'CREATE', 'USERS', user.id, user.username, f"Created user '{user.username}' with role {user.role}")

    def perform_update(self, serializer):
        instance = self.get_object()
        new_role = serializer.validated_data.get('role', instance.role)
        new_status = serializer.validated_data.get('status', instance.status)
        new_is_active = serializer.validated_data.get('is_active', instance.is_active)

        # Safety Check: Prevent accidental lockout by demoting or deactivating the last active Master Admin
        if instance.is_master_admin and (new_role != User.Role.MASTER_ADMIN or new_status != User.Status.ACTIVE or not new_is_active):
            active_master_count = User.objects.filter(
                role=User.Role.MASTER_ADMIN,
                status=User.Status.ACTIVE,
                is_active=True
            ).exclude(id=instance.id).count()

            if active_master_count == 0:
                raise ValidationError({
                    'detail': 'WARNING: Cannot deactivate, suspend, or remove Master Admin role from the last active Master Admin account. Doing so would permanently lock out administrative access.'
                })

        user = serializer.save()
        log_audit(self.request, 'UPDATE', 'USERS', user.id, user.username, f"Updated user '{user.username}' (Role: {user.role}, Status: {user.status})")

    def perform_destroy(self, instance):
        # Safety Check: Prevent deleting the last active Master Admin account
        if instance.is_master_admin:
            active_master_count = User.objects.filter(
                role=User.Role.MASTER_ADMIN,
                status=User.Status.ACTIVE,
                is_active=True
            ).exclude(id=instance.id).count()

            if active_master_count == 0:
                raise ValidationError({
                    'detail': 'WARNING: Cannot delete the last active Master Admin account. Doing so would lock out system administration.'
                })

        uid = instance.id
        username = instance.username
        instance.delete()
        log_audit(self.request, 'DELETE', 'USERS', uid, username, f"Deleted user '{username}'")


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [CanViewAuditLogs]

    def get_queryset(self):
        qs = super().get_queryset()
        module = self.request.query_params.get('module')
        action = self.request.query_params.get('action')
        search = self.request.query_params.get('search')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if module:
            qs = qs.filter(module__iexact=module)
        if action:
            qs = qs.filter(action__iexact=action)
        if start_date:
            qs = qs.filter(timestamp__date__gte=start_date)
        if end_date:
            qs = qs.filter(timestamp__date__lte=end_date)
        if search:
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(user_repr__icontains=search) |
                Q(record_repr__icontains=search)
            )
        return qs


class SettingsView(APIView):
    permission_classes = [CanManageSettings]

    def get(self, request):
        settings_qs = SystemSetting.objects.all()
        data = {s.key: s.value for s in settings_qs}
        # Provide sensible defaults
        defaults = {
            'company_info': {
                'name': 'Alaala Funeral Homes',
                'tagline': 'Dignified & Compassionate Service',
                'contact_email': 'contact@alaalafuneral.ph',
                'contact_phone': '+63 912 345 6789',
                'address': 'Main Highway, Batangas City, Philippines',
            },
            'shift_schedules': [
                {'name': 'Morning Shift', 'time': '8am to 5pm'},
                {'name': 'Afternoon / Evening Shift', 'time': '4pm to 1am'},
                {'name': 'Graveyard / Night Shift', 'time': '12midnight to 9am'}
            ],
            'system_preferences': {
                'currency': 'PHP',
                'low_stock_default': 5,
                'audit_logging_enabled': True,
                'session_timeout_minutes': 60,
                'dark_mode_allowed': True
            }
        }
        for k, v in defaults.items():
            if k not in data:
                data[k] = v
        return Response(data)

    def post(self, request):
        for key, val in request.data.items():
            SystemSetting.objects.update_or_create(
                key=key,
                defaults={'value': val, 'description': f"Setting for {key}"}
            )
        log_audit(request, 'UPDATE', 'SETTINGS', 'SYSTEM', 'Preferences', "Updated system configuration settings.")
        return Response({'detail': 'Settings saved successfully.'})

    def put(self, request):
        return self.post(request)


from django.utils import timezone
from django.db.models import Count, Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from caskets.models import Deceased, LamayRecord, Chapel

class AnalyticsView(APIView):
    """
    Analytics Dashboard View focused on Funeral/Deceased tracking.
    Available to users with 'CanViewAnalytics' permission or Master Admins.
    """
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]

    def get(self, request):
        date_filter = request.query_params.get('date_filter', 'this_month')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        now = timezone.now()
        today = now.date()
        start_date = None
        end_date = today

        if date_filter == 'this_week':
            start_date = today - timedelta(days=today.weekday())
        elif date_filter == 'this_month':
            start_date = today.replace(day=1)
        elif date_filter == 'last_month':
            first_day_this_month = today.replace(day=1)
            end_date = first_day_this_month - timedelta(days=1)
            start_date = end_date.replace(day=1)
        elif date_filter == 'this_year':
            start_date = today.replace(month=1, day=1)
        elif date_filter == 'last_year':
            end_date = today.replace(month=1, day=1) - timedelta(days=1)
            start_date = end_date.replace(month=1, day=1)
        elif date_filter == 'custom':
            if start_date_str:
                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass
            if end_date_str:
                try:
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

        # If no valid date range determined, default to all-time or this month
        
        # Deceased queries
        deceased_qs = Deceased.objects.all()
        if start_date:
            deceased_period_qs = deceased_qs.filter(date_of_death__gte=start_date, date_of_death__lte=end_date)
        else:
            deceased_period_qs = deceased_qs

        total_deceased = deceased_qs.count()
        period_deceased = deceased_period_qs.count()

        # Lamay and Chapel counts (current active state)
        active_lamay = LamayRecord.objects.filter(status='ACTIVE').count()
        completed_lamay = LamayRecord.objects.filter(status='COMPLETED').count() # we could filter this by date if needed, but total completed is fine. Let's filter by period if possible? "Completed Lamay" usually implies all-time or within period. Let's do within period based on created_at or end_date. LamayRecord might have 'end_date' or 'completed_at'. Since we don't know, let's just do all completed.
        chapel_occupancy = Chapel.objects.filter(is_active=True, status='OCCUPIED').count()
        total_chapels = Chapel.objects.filter(is_active=True).count()

        # Trends
        # For line chart: deaths this week/month etc
        if date_filter in ['this_year', 'last_year']:
            # Group by month
            trend_data = list(deceased_period_qs.annotate(
                period=TruncMonth('date_of_death')
            ).values('period').annotate(count=Count('id')).order_by('period'))
            # format period to string
            for t in trend_data:
                if t['period']:
                    t['period'] = t['period'].strftime('%b %Y')
        elif date_filter in ['this_week']:
            # Group by day
            trend_data = list(deceased_period_qs.annotate(
                period=TruncDay('date_of_death')
            ).values('period').annotate(count=Count('id')).order_by('period'))
            for t in trend_data:
                if t['period']:
                    t['period'] = t['period'].strftime('%a, %b %d')
        else:
            # this month, last month -> group by week or day? day is fine
            trend_data = list(deceased_period_qs.annotate(
                period=TruncDay('date_of_death')
            ).values('period').annotate(count=Count('id')).order_by('period'))
            for t in trend_data:
                if t['period']:
                    t['period'] = t['period'].strftime('%b %d')

        # Additional Charts
        lamay_status = list(LamayRecord.objects.values('status').annotate(count=Count('id')).order_by('-count'))
        
        chapel_list = Chapel.objects.filter(is_active=True).values('name', 'status', 'capacity')
        
        location_data = list(LamayRecord.objects.values('wake_location').annotate(count=Count('id')).order_by('-count'))

        return Response({
            'summary_cards': {
                'total_deceased': total_deceased,
                'period_deceased': period_deceased,
                'active_lamay': active_lamay,
                'completed_lamay': completed_lamay,
                'chapel_occupancy': chapel_occupancy,
                'total_chapels': total_chapels,
            },
            'trend_data': trend_data,
            'lamay_status': lamay_status,
            'chapel_list': list(chapel_list),
            'location_data': location_data,
            'filter_info': {
                'start_date': start_date.strftime('%Y-%m-%d') if start_date else None,
                'end_date': end_date.strftime('%Y-%m-%d') if end_date else None,
                'label': date_filter.replace('_', ' ').title()
            }
        })


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from inventory.models import InventoryItem
        from laundry.models import LaundryRecord
        from caskets.models import Casket, Chapel, LamayRecord, CasketSale
        from maintenance.models import Maintenance
        from utilities.models import WaterBill, ElectricityBill

        user = request.user
        accessible_loc_ids = user.get_accessible_location_ids()

        # Strict Queryset isolation: If not Master Admin, filter by accessible locations
        if user.is_master_admin:
            active_items = InventoryItem.objects.filter(is_active=True)
            caskets_qs = Casket.objects.all()
            laundry_qs = LaundryRecord.objects.all()
            maint_qs = Maintenance.objects.all()
            locations_qs = Location.objects.filter(is_active=True)
            water_qs = WaterBill.objects.all()
            elec_qs = ElectricityBill.objects.all()
            chapels_qs = Chapel.objects.filter(is_active=True)
            lamay_qs = LamayRecord.objects.all()
        else:
            active_items = InventoryItem.objects.filter(is_active=True, location_id__in=accessible_loc_ids)
            caskets_qs = Casket.objects.filter(location_id__in=accessible_loc_ids)
            laundry_qs = LaundryRecord.objects.filter(location_id__in=accessible_loc_ids)
            maint_qs = Maintenance.objects.filter(location_id__in=accessible_loc_ids)
            locations_qs = Location.objects.filter(is_active=True, id__in=accessible_loc_ids)
            chapels_qs = Chapel.objects.filter(is_active=True)
            lamay_qs = LamayRecord.objects.all()

            # Utilities access check: Staff without custom perm cannot see water or electricity
            has_water = user.is_simple_admin or user.has_custom_perm('water')
            has_elec = user.is_simple_admin or user.has_custom_perm('electricity')
            water_qs = WaterBill.objects.filter(location_id__in=accessible_loc_ids) if has_water else WaterBill.objects.none()
            elec_qs = ElectricityBill.objects.filter(location_id__in=accessible_loc_ids) if has_elec else ElectricityBill.objects.none()

        # 1. Total Inventory
        total_items = active_items.count()
        total_quantity = active_items.aggregate(total=Sum('current_quantity'))['total'] or 0
        low_stock_count = active_items.filter(status='LOW_STOCK').count()
        out_of_stock_count = active_items.filter(status='OUT_OF_STOCK').count()

        # 2. Caskets
        caskets_available = caskets_qs.filter(status='AVAILABLE').aggregate(total=Sum('quantity'))['total'] or 0
        caskets_reserved = caskets_qs.filter(status='RESERVED').aggregate(total=Sum('quantity'))['total'] or 0
        caskets_sold_used = caskets_qs.filter(status__in=['SOLD', 'USED']).count() + CasketSale.objects.count()
        caskets_repair = caskets_qs.filter(status='FOR_REPAIR').aggregate(total=Sum('quantity'))['total'] or 0

        # 2b. Chapels & Lamay
        total_chapels = chapels_qs.count()
        chapels_available = chapels_qs.filter(status=Chapel.Status.AVAILABLE).count()
        chapels_occupied = chapels_qs.filter(status=Chapel.Status.OCCUPIED).count()
        chapels_cleaning = chapels_qs.filter(status=Chapel.Status.CLEANING).count()
        chapels_maintenance = chapels_qs.filter(status__in=[Chapel.Status.MAINTENANCE, Chapel.Status.OUT_OF_SERVICE]).count()

        active_lamays_qs = lamay_qs.filter(status=LamayRecord.Status.ACTIVE).select_related(
            'chapel', 'deceased', 'buyer', 'casket'
        ).order_by('-lamay_start_date')
        current_lamay_count = active_lamays_qs.count()
        current_lamay_list = [
            {
                'id': l.id,
                'lamay_id': l.lamay_id,
                'chapel_id': l.chapel.id if l.chapel else None,
                'chapel_name': l.chapel.name if l.chapel else (f"Residence ({l.residence_address})" if l.residence_address else 'Residence / Home Viewing'),
                'is_residence': l.is_residence,
                'residence_address': l.residence_address,
                'deceased_name': l.deceased.full_name,
                'deceased_age': l.deceased.age,
                'deceased_sex': l.deceased.sex,
                'deceased_date_of_death': str(l.deceased.date_of_death) if l.deceased.date_of_death else '',
                'funeral_case_id': l.funeral_case_id or l.deceased.funeral_case_id,
                'buyer_name': l.buyer.full_name,
                'buyer_contact': l.buyer.contact_number,
                'buyer_address': l.buyer.address,
                'buyer_relationship': l.buyer.relationship_to_deceased,
                'casket_id': l.casket.casket_id if l.casket else '',
                'casket_model': l.casket.model if l.casket else '',
                'casket_info': f"{l.casket.casket_id} - {l.casket.model}" if l.casket else 'Standard Package',
                'lamay_start_date': str(l.lamay_start_date),
                'lamay_start_time': str(l.lamay_start_time) if l.lamay_start_time else '',
                'expected_end_date': str(l.expected_end_date) if l.expected_end_date else '',
                'expected_burial_date': str(l.expected_burial_date) if l.expected_burial_date else '',
                'burial_time': str(l.burial_time) if l.burial_time else '',
                'status': l.status,
                'status_display': l.get_status_display(),
                'notes': l.notes,
                'encoded_by': l.encoded_by.get_full_name() or l.encoded_by.username if l.encoded_by else 'System'
            }
            for l in active_lamays_qs
        ]

        # 3. Laundry in Process
        laundry_in_process = laundry_qs.exclude(status='RETURNED').count()
        laundry_by_status = laundry_qs.values('status').annotate(count=Count('id')).order_by('status')

        # 4. Open Maintenance
        open_maintenance = maint_qs.filter(status__in=['REPORTED', 'PENDING', 'FOR_REPAIR', 'IN_PROGRESS']).count()
        urgent_maintenance = maint_qs.filter(status__in=['REPORTED', 'PENDING', 'FOR_REPAIR', 'IN_PROGRESS'], priority__in=['URGENT', 'HIGH']).count()

        # 5. Utilities
        unpaid_water = water_qs.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        unpaid_electricity = elec_qs.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        total_unpaid_bills_amount = (unpaid_water['total'] or 0) + (unpaid_electricity['total'] or 0)
        total_unpaid_bills_count = (unpaid_water['count'] or 0) + (unpaid_electricity['count'] or 0)

        # 6. Inventory By Location
        inventory_by_location = []
        for loc in locations_qs:
            loc_items = active_items.filter(location=loc)
            qty = loc_items.aggregate(total=Sum('current_quantity'))['total'] or 0
            items_count = loc_items.count()
            low_count = loc_items.filter(status='LOW_STOCK').count()
            out_count = loc_items.filter(status='OUT_OF_STOCK').count()
            inventory_by_location.append({
                'location_id': loc.id,
                'location_name': loc.name,
                'location_code': loc.code,
                'total_items': items_count,
                'total_quantity': qty,
                'low_stock_count': low_count,
                'out_of_stock_count': out_count,
            })

        # 7. Low Stock & Out of Stock Items detail
        low_stock_items = [
            {
                'id': item.id,
                'item_name': item.item_name,
                'location': item.location.name,
                'current_quantity': item.current_quantity,
                'minimum_stock': item.minimum_stock,
                'unit': item.unit,
                'status': item.status
            }
            for item in active_items.filter(status='LOW_STOCK')[:10]
        ]

        out_of_stock_items = [
            {
                'id': item.id,
                'item_name': item.item_name,
                'location': item.location.name,
                'current_quantity': item.current_quantity,
                'minimum_stock': item.minimum_stock,
                'unit': item.unit,
                'status': item.status
            }
            for item in active_items.filter(status='OUT_OF_STOCK')[:10]
        ]

        # 8. Maintenance Alerts
        maintenance_alerts = [
            {
                'id': m.id,
                'maintenance_id': m.maintenance_id,
                'location': m.location.name,
                'category': m.category,
                'issue': m.issue,
                'priority': m.priority,
                'status': m.status,
                'date_reported': m.date_reported
            }
            for m in maint_qs.filter(status__in=['REPORTED', 'PENDING', 'FOR_REPAIR', 'IN_PROGRESS']).order_by('-priority', '-date_reported')[:5]
        ]

        # 9. Recent bills
        recent_water_bills = [
            {
                'id': b.id,
                'location': b.location.name,
                'billing_period': b.billing_period,
                'amount': float(b.amount),
                'consumption': float(b.consumption),
                'due_date': b.due_date,
                'payment_status': b.payment_status
            }
            for b in water_qs.order_by('-due_date')[:5]
        ]

        recent_electricity_bills = [
            {
                'id': b.id,
                'location': b.location.name,
                'billing_period': b.billing_period,
                'amount': float(b.amount),
                'consumption': float(b.consumption),
                'due_date': b.due_date,
                'payment_status': b.payment_status
            }
            for b in elec_qs.order_by('-due_date')[:5]
        ]

        return Response({
            'kpis': {
                'total_inventory_items': total_items,
                'total_available_quantity': total_quantity,
                'low_stock_count': low_stock_count,
                'out_of_stock_count': out_of_stock_count,
                'caskets_available': caskets_available,
                'caskets_reserved': caskets_reserved,
                'caskets_sold_used': caskets_sold_used,
                'caskets_for_repair': caskets_repair,
                'total_chapels': total_chapels,
                'chapels_available': chapels_available,
                'chapels_occupied': chapels_occupied,
                'chapels_cleaning': chapels_cleaning,
                'chapels_maintenance': chapels_maintenance,
                'current_lamay_count': current_lamay_count,
                'laundry_in_process': laundry_in_process,
                'open_maintenance': open_maintenance,
                'urgent_maintenance': urgent_maintenance,
                'unpaid_bills_count': total_unpaid_bills_count,
                'unpaid_bills_amount': float(total_unpaid_bills_amount),
                'unpaid_water_amount': float(unpaid_water['total'] or 0),
                'unpaid_electricity_amount': float(unpaid_electricity['total'] or 0),
            },
            'chapels_summary': {
                'total': total_chapels,
                'available': chapels_available,
                'occupied': chapels_occupied,
                'cleaning': chapels_cleaning,
                'maintenance': chapels_maintenance
            },
            'current_lamay': current_lamay_list,
            'inventory_by_location': inventory_by_location,
            'low_stock_items': low_stock_items,
            'out_of_stock_items': out_of_stock_items,
            'laundry_by_status': list(laundry_by_status),
            'maintenance_alerts': maintenance_alerts,
            'recent_water_bills': recent_water_bills,
            'recent_electricity_bills': recent_electricity_bills,
        })
