import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { api } from '../../services/api';

const TRANSACTION_TYPES = [
  { value: 'STOCK_IN', label: 'Stock In (Intake / Replenish)' },
  { value: 'STOCK_OUT', label: 'Stock Out (General Issue)' },
  { value: 'TRANSFER', label: 'Transfer to another Location' },
  { value: 'ADJUSTMENT', label: 'Inventory Count Adjustment' },
  { value: 'RETURN', label: 'Return from Service' },
  { value: 'DAMAGED', label: 'Damaged / Write-off' },
  { value: 'LOST', label: 'Lost / Missing' },
  { value: 'CONSUMED', label: 'Consumed in Viewing Chapel' },
];

export default function TransactModal({
  isOpen,
  onClose,
  item,
  locations = [],
  onSuccess,
}) {
  const [transactionType, setTransactionType] = useState('STOCK_IN');
  const [quantity, setQuantity] = useState(1);
  const [toLocation, setToLocation] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item && isOpen) {
      setTransactionType('STOCK_IN');
      setQuantity(1);
      setToLocation('');
      setReason('');
      setNotes('');
      setError('');
    }
  }, [item, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (transactionType === 'TRANSFER' && !toLocation) {
      setError('Please select a destination location for the transfer.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for this inventory movement.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        transaction_type: transactionType,
        quantity: parseInt(quantity, 10),
        to_location: transactionType === 'TRANSFER' ? toLocation : null,
        reason: reason.trim(),
        notes: notes.trim(),
      };

      const res = await api.post(`/inventory/${item.id}/transact/`, payload);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Transaction failed. Please check quantity.');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const otherLocations = locations.filter((loc) => loc.id !== item.location);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Movement"
      subtitle={`${item.item_name} at ${item.location_details?.name || 'Location'}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Current Info */}
        <div className="p-3 bg-[#F0F2F5]/40 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Current Stock:</span>
            <span className="font-bold text-blue-500">
              {item.current_quantity} {item.unit}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Minimum Threshold:</span>
            <span className="font-semibold text-slate-700">
              {item.minimum_stock} {item.unit}
            </span>
          </div>
        </div>

        <Select
          label="Transaction Type"
          required
          options={TRANSACTION_TYPES}
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min="1"
            label={`Quantity (${item.unit})`}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          {transactionType === 'TRANSFER' && (
            <Select
              label="Transfer To Location"
              required
              options={otherLocations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Select destination"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
            />
          )}
        </div>

        <Input
          label="Reason for Movement"
          placeholder="e.g. Replenishment for viewing service, Re-supply"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Input
          label="Additional Notes / Reference"
          placeholder="e.g. PO #1024, Service Contract #998"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Confirm Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
