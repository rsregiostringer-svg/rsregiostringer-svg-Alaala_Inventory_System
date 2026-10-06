from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.core.exceptions import ValidationError
from .models import Category, InventoryItem, InventoryTransaction
from .serializers import CategorySerializer, InventoryItemSerializer, InventoryTransactionSerializer
from .services import execute_inventory_transaction
from core.models import Location
from core.permissions import IsMasterAdmin, IsManagerOrHigher, ReadOnlyOrManager
from core.audit import log_audit


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None
    permission_classes = [ReadOnlyOrManager]

    def perform_create(self, serializer):
        cat = serializer.save()
        log_audit(self.request, 'CREATE', 'INVENTORY', cat.id, cat.name, f"Created category '{cat.name}'")

    def perform_update(self, serializer):
        cat = serializer.save()
        log_audit(self.request, 'UPDATE', 'INVENTORY', cat.id, cat.name, f"Updated category '{cat.name}'")


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related('category', 'location').all()
    serializer_class = InventoryItemSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsMasterAdmin()]
        return [ReadOnlyOrManager()]

    def perform_destroy(self, instance):
        uid = instance.id
        name = instance.item_name
        instance.delete()
        log_audit(self.request, 'DELETE', 'INVENTORY', uid, name, f"Deleted inventory item '{name}'")

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_master_admin:
            loc_ids = self.request.user.get_accessible_location_ids()
            qs = qs.filter(location_id__in=loc_ids)

        location_id = self.request.query_params.get('location')
        category_id = self.request.query_params.get('category')
        item_status = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')

        if location_id:
            qs = qs.filter(location_id=location_id)
        if category_id:
            qs = qs.filter(category_id=category_id)
        if item_status:
            qs = qs.filter(status=item_status)
        if is_active is not None and is_active != '':
            qs = qs.filter(is_active=is_active.lower() in ('true', '1'))
        if search:
            qs = qs.filter(
                Q(item_name__icontains=search) |
                Q(description__icontains=search) |
                Q(supplier__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        item = serializer.save()
        log_audit(
            self.request, 'CREATE', 'INVENTORY', item.id, item.item_name,
            f"Created inventory item '{item.item_name}' at '{item.location.name}' with initial qty {item.current_quantity}"
        )

    def perform_update(self, serializer):
        old_item = self.get_object()
        old_val = {'quantity': old_item.current_quantity, 'cost': float(old_item.cost)}
        item = serializer.save()
        log_audit(
            self.request, 'UPDATE', 'INVENTORY', item.id, item.item_name,
            f"Updated details of inventory item '{item.item_name}'",
            old_value=old_val,
            new_value={'quantity': item.current_quantity, 'cost': float(item.cost)}
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def transact(self, request, pk=None):
        item = self.get_object()
        transaction_type = request.data.get('transaction_type')
        quantity = request.data.get('quantity')
        to_location_id = request.data.get('to_location')
        reason = request.data.get('reason', '')
        notes = request.data.get('notes', '')

        if not transaction_type or quantity is None:
            return Response(
                {'detail': 'transaction_type and quantity are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            qty_int = int(quantity)
        except ValueError:
            return Response({'detail': 'Quantity must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        to_location = None
        if to_location_id:
            try:
                to_location = Location.objects.get(pk=to_location_id)
            except Location.DoesNotExist:
                return Response({'detail': 'Destination location does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            tx = execute_inventory_transaction(
                item=item,
                transaction_type=transaction_type,
                quantity=qty_int,
                user=request.user,
                to_location=to_location,
                reason=reason,
                notes=notes,
                request=request
            )
            return Response({
                'detail': 'Transaction completed successfully.',
                'transaction': InventoryTransactionSerializer(tx).data,
                'item': InventoryItemSerializer(item).data
            })
        except ValidationError as e:
            return Response({'detail': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': f"Transaction error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        items = self.queryset.filter(status__in=['LOW_STOCK', 'OUT_OF_STOCK'], is_active=True)
        return Response(InventoryItemSerializer(items, many=True).data)


class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryTransaction.objects.select_related('item', 'from_location', 'to_location', 'user').all()
    serializer_class = InventoryTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_master_admin:
            loc_ids = self.request.user.get_accessible_location_ids()
            qs = qs.filter(Q(from_location_id__in=loc_ids) | Q(to_location_id__in=loc_ids))

        item_id = self.request.query_params.get('item')
        tx_type = self.request.query_params.get('type')
        location_id = self.request.query_params.get('location')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if item_id:
            qs = qs.filter(item_id=item_id)
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)
        if location_id:
            qs = qs.filter(Q(from_location_id=location_id) | Q(to_location_id=location_id))
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
        return qs
