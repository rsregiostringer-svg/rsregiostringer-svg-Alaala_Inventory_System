from django.db import transaction
from django.core.exceptions import ValidationError
from .models import InventoryItem, InventoryTransaction
from core.audit import log_audit
from alaala_backend.realtime import broadcast_event


@transaction.atomic
def execute_inventory_transaction(
    item: InventoryItem,
    transaction_type: str,
    quantity: int,
    user=None,
    to_location=None,
    reason: str = '',
    notes: str = '',
    request=None
):
    if quantity <= 0:
        raise ValidationError("Quantity must be greater than zero.")

    old_qty = item.current_quantity
    from_loc = item.location
    audit_desc = ""

    if transaction_type in [InventoryTransaction.TransactionType.STOCK_IN, InventoryTransaction.TransactionType.RETURN]:
        item.current_quantity += quantity
        item.save()
        audit_desc = f"{user.username if user else 'System'} added {quantity} {item.unit} to {item.item_name} at {from_loc.name} ({transaction_type})."

    elif transaction_type in [
        InventoryTransaction.TransactionType.STOCK_OUT,
        InventoryTransaction.TransactionType.DAMAGED,
        InventoryTransaction.TransactionType.LOST,
        InventoryTransaction.TransactionType.CONSUMED
    ]:
        if item.current_quantity < quantity:
            raise ValidationError(
                f"Insufficient stock for '{item.item_name}'. Current stock is {item.current_quantity} {item.unit}, attempted to deduct {quantity} {item.unit}."
            )
        item.current_quantity -= quantity
        item.save()
        audit_desc = f"{user.username if user else 'System'} removed {quantity} {item.unit} from {item.item_name} at {from_loc.name} ({transaction_type}). Reason: {reason}"

    elif transaction_type == InventoryTransaction.TransactionType.ADJUSTMENT:
        # Reason indicates why
        if item.current_quantity < quantity:
            raise ValidationError(
                f"Cannot adjust stock below zero. Current quantity is {item.current_quantity}."
            )
        # Note: quantity for adjustment in payload can be handled
        item.save()
        audit_desc = f"Stock adjusted for {item.item_name} at {from_loc.name} to {item.current_quantity}."

    elif transaction_type == InventoryTransaction.TransactionType.TRANSFER:
        if not to_location:
            raise ValidationError("A destination location must be specified for stock transfer.")
        if from_loc == to_location:
            raise ValidationError("Source and destination locations cannot be the same.")
        if item.current_quantity < quantity:
            raise ValidationError(
                f"Insufficient stock for transfer. Location '{from_loc.name}' only has {item.current_quantity} {item.unit} of '{item.item_name}'."
            )

        # 1. Deduct from source
        item.current_quantity -= quantity
        item.save()

        # 2. Add or create in destination location
        dest_item, created = InventoryItem.objects.select_for_update().get_or_create(
            item_name=item.item_name,
            location=to_location,
            defaults={
                'category': item.category,
                'description': item.description,
                'unit': item.unit,
                'minimum_stock': item.minimum_stock,
                'maximum_stock': item.maximum_stock,
                'supplier': item.supplier,
                'cost': item.cost,
                'current_quantity': 0,
                'is_active': True,
            }
        )
        dest_item.current_quantity += quantity
        dest_item.save()

        audit_desc = f"{user.username if user else 'System'} transferred {quantity} {item.unit} of '{item.item_name}' from {from_loc.name} to {to_location.name}."
    else:
        raise ValidationError(f"Invalid transaction type: {transaction_type}")

    # Create transaction log
    tx = InventoryTransaction.objects.create(
        item=item,
        transaction_type=transaction_type,
        quantity=quantity,
        from_location=from_loc,
        to_location=to_location,
        user=user,
        reason=reason,
        notes=notes
    )

    # Log audit
    log_audit(
        request=request,
        action=transaction_type,
        module='INVENTORY',
        record_id=item.id,
        record_repr=f"{item.item_name} ({from_loc.name})",
        old_value={'quantity': old_qty, 'status': item.status},
        new_value={'quantity': item.current_quantity, 'status': item.status},
        description=audit_desc
    )

    # Broadcast realtime event
    broadcast_event('inventory.updated', {
        'item_id': item.id,
        'item_name': item.item_name,
        'location': from_loc.name,
        'new_quantity': item.current_quantity,
        'status': item.status,
    })
    broadcast_event('inventory.transaction.created', {
        'transaction_id': tx.id,
        'item_name': item.item_name,
        'type': transaction_type,
        'quantity': quantity,
        'from': from_loc.name if from_loc else None,
        'to': to_location.name if to_location else None,
    })

    return tx
