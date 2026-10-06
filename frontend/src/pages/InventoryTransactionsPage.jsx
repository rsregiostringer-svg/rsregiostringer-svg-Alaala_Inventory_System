import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import Input from '../components/common/Input';
import { formatDateTime } from '../utils/formatters';
import { RefreshCw, Filter, ArrowRight } from 'lucide-react';

const TRANSACTION_BADGES = {
  STOCK_IN: { label: 'Stock In', variant: 'success' },
  STOCK_OUT: { label: 'Stock Out', variant: 'secondary' },
  TRANSFER: { label: 'Transfer', variant: 'primary' },
  ADJUSTMENT: { label: 'Adjustment', variant: 'info' },
  RETURN: { label: 'Return', variant: 'accent' },
  DAMAGED: { label: 'Damaged', variant: 'danger' },
  LOST: { label: 'Lost', variant: 'danger' },
  CONSUMED: { label: 'Consumed', variant: 'warning' },
};

export default function InventoryTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { pollTick, subscribe } = useRealtime();

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, locRes] = await Promise.all([
        api.get('/inventory/transactions/', {
          type: typeFilter,
          location: locationFilter,
          start_date: startDate,
          end_date: endDate,
        }),
        api.get('/locations/'),
      ]);
      setTransactions(txRes.results || txRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, locationFilter, startDate, endDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, pollTick]);

  useEffect(() => {
    const unsub = subscribe('inventory.transaction.created', () => loadTransactions());
    return () => unsub();
  }, [subscribe, loadTransactions]);

  const columns = [
    {
      header: 'Date & Time',
      key: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-600 font-mono">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      header: 'Type',
      key: 'transaction_type',
      render: (row) => {
        const meta = TRANSACTION_BADGES[row.transaction_type] || { label: row.transaction_type, variant: 'neutral' };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      header: 'Item',
      key: 'item_name',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-100">{row.item_name}</span>
        </div>
      ),
    },
    {
      header: 'Quantity',
      key: 'quantity',
      render: (row) => (
        <span className="font-bold text-blue-500">
          {row.quantity} <span className="text-xs font-normal text-slate-500">{row.item_unit}</span>
        </span>
      ),
    },
    {
      header: 'Route (From → To)',
      key: 'route',
      render: (row) => {
        if (row.transaction_type === 'TRANSFER') {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-600 font-medium">{row.from_location_name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-blue-500 font-semibold">{row.to_location_name}</span>
            </div>
          );
        }
        return (
          <span className="text-xs text-slate-500">
            {row.to_location_name || row.from_location_name || '—'}
          </span>
        );
      },
    },
    {
      header: 'Reason / Notes',
      key: 'reason',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-700">{row.reason}</p>
          {row.notes && <p className="text-[11px] text-slate-500 mt-0.5">{row.notes}</p>}
        </div>
      ),
    },
    {
      header: 'Operator',
      key: 'user_name',
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.user_name || 'System'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            Inventory Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit trail of all stock movements, intakes, transfers, and deductions.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadTransactions} icon={RefreshCw}>
          Refresh Ledger
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            options={[
              { value: 'STOCK_IN', label: 'Stock In' },
              { value: 'STOCK_OUT', label: 'Stock Out' },
              { value: 'TRANSFER', label: 'Transfer' },
              { value: 'ADJUSTMENT', label: 'Adjustment' },
              { value: 'RETURN', label: 'Return' },
              { value: 'DAMAGED', label: 'Damaged' },
              { value: 'LOST', label: 'Lost' },
              { value: 'CONSUMED', label: 'Consumed' },
            ]}
            placeholder="All Transaction Types"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="All Locations"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>

        <div className="w-40">
          <Input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="w-40">
          <Input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {(typeFilter || locationFilter || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter('');
              setLocationFilter('');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Transactions Table */}
      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyTitle="No transactions recorded"
        emptyDescription="Inventory movements will automatically be logged here."
      />
    </div>
  );
}
