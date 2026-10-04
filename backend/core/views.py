from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q
from .models import User, Location, AuditLog
from .serializers import UserSerializer, UserCreateUpdateSerializer, LocationSerializer, AuditLogSerializer
from .permissions import IsMasterAdmin, IsAdminOrHigher, IsManagerOrHigher
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

        if not user.is_active:
            return Response(
                {'detail': 'User account has been deactivated.'},
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


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrHigher()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        loc = serializer.save()
        log_audit(self.request, 'CREATE', 'LOCATIONS', loc.id, loc.name, f"Created location '{loc.name}'")

    def perform_update(self, serializer):
        loc = serializer.save()
        log_audit(self.request, 'UPDATE', 'LOCATIONS', loc.id, loc.name, f"Updated location '{loc.name}'")


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsMasterAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [IsAdminOrHigher()]
        return [IsAdminOrHigher()]

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit(self.request, 'CREATE', 'USERS', user.id, user.username, f"Created user '{user.username}' with role {user.role}")

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit(self.request, 'UPDATE', 'USERS', user.id, user.username, f"Updated user '{user.username}'")


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrHigher]

    def get_queryset(self):
        qs = super().get_queryset()
        module = self.request.query_params.get('module')
        action = self.request.query_params.get('action')
        search = self.request.query_params.get('search')
        if module:
            qs = qs.filter(module__iexact=module)
        if action:
            qs = qs.filter(action__iexact=action)
        if search:
            qs = qs.filter(Q(description__icontains=search) | Q(user_repr__icontains=search) | Q(record_repr__icontains=search))
        return qs


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from inventory.models import InventoryItem
        from laundry.models import LaundryRecord
        from caskets.models import Casket
        from maintenance.models import Maintenance
        from utilities.models import WaterBill, ElectricityBill

        # 1. Total Inventory
        active_items = InventoryItem.objects.filter(is_active=True)
        total_items = active_items.count()
        total_quantity = active_items.aggregate(total=Sum('current_quantity'))['total'] or 0
        low_stock_count = active_items.filter(status='LOW_STOCK').count()
        out_of_stock_count = active_items.filter(status='OUT_OF_STOCK').count()

        # 2. Caskets
        caskets_available = Casket.objects.filter(status='AVAILABLE').aggregate(total=Sum('quantity'))['total'] or 0
        caskets_reserved = Casket.objects.filter(status='RESERVED').aggregate(total=Sum('quantity'))['total'] or 0
        caskets_repair = Casket.objects.filter(status='FOR_REPAIR').aggregate(total=Sum('quantity'))['total'] or 0

        # 3. Laundry in Process
        laundry_in_process = LaundryRecord.objects.exclude(status='RETURNED').count()
        laundry_by_status = LaundryRecord.objects.values('status').annotate(count=Count('id')).order_by('status')

        # 4. Open Maintenance
        open_maintenance = Maintenance.objects.filter(status__in=['REPORTED', 'PENDING', 'IN_PROGRESS']).count()
        urgent_maintenance = Maintenance.objects.filter(status__in=['REPORTED', 'PENDING', 'IN_PROGRESS'], priority__in=['URGENT', 'HIGH']).count()

        # 5. Utilities
        unpaid_water = WaterBill.objects.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        unpaid_electricity = ElectricityBill.objects.filter(payment_status__in=['UNPAID', 'OVERDUE']).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        total_unpaid_bills_amount = (unpaid_water['total'] or 0) + (unpaid_electricity['total'] or 0)
        total_unpaid_bills_count = (unpaid_water['count'] or 0) + (unpaid_electricity['count'] or 0)

        # 6. Inventory By Location
        locations = Location.objects.filter(is_active=True)
        inventory_by_location = []
        for loc in locations:
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
            for m in Maintenance.objects.filter(status__in=['REPORTED', 'PENDING', 'IN_PROGRESS']).order_by('-priority', '-date_reported')[:5]
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
            for b in WaterBill.objects.all().order_by('-due_date')[:5]
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
            for b in ElectricityBill.objects.all().order_by('-due_date')[:5]
        ]

        return Response({
            'kpis': {
                'total_inventory_items': total_items,
                'total_available_quantity': total_quantity,
                'low_stock_count': low_stock_count,
                'out_of_stock_count': out_of_stock_count,
                'caskets_available': caskets_available,
                'caskets_reserved': caskets_reserved,
                'caskets_for_repair': caskets_repair,
                'laundry_in_process': laundry_in_process,
                'open_maintenance': open_maintenance,
                'urgent_maintenance': urgent_maintenance,
                'unpaid_bills_count': total_unpaid_bills_count,
                'unpaid_bills_amount': float(total_unpaid_bills_amount),
                'unpaid_water_amount': float(unpaid_water['total'] or 0),
                'unpaid_electricity_amount': float(unpaid_electricity['total'] or 0),
            },
            'inventory_by_location': inventory_by_location,
            'low_stock_items': low_stock_items,
            'out_of_stock_items': out_of_stock_items,
            'laundry_by_status': list(laundry_by_status),
            'maintenance_alerts': maintenance_alerts,
            'recent_water_bills': recent_water_bills,
            'recent_electricity_bills': recent_electricity_bills,
        })
