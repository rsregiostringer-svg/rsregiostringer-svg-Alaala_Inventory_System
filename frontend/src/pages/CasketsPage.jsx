import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { formatCurrency, formatDate, CASKET_STATUS_MAP, CASKET_CONDITION_MAP } from '../utils/formatters';
import { Plus, RefreshCw, Box, Tag, History, CheckCircle2 } from 'lucide-react';

export default function CasketsPage() {
  const [caskets, setCaskets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  // Modals
  const [statusCasket, setStatusCasket] = useState(null);
  const [newStatus, setNewStatus] = useState('RESERVED');
  const [deceasedName, setDeceasedName] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    casket_id: '',
    model: '',
    casket_type: 'Wood',
    size: 'Standard Adult',
    color: '',
    material: '',
    supplier: '',
    purchase_cost: '',
    selling_price: '',
    quantity: 1,
    location: '',
    condition: 'NEW',
    status: 'AVAILABLE',
    date_received: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // View History Modal
  const [historyCasket, setHistoryCasket] = useState(null);

  const { pollTick, subscribe } = useRealtime();

  const loadCaskets = useCallback(async () => {
    setLoading(true);
    try {
      const [caskRes, locRes] = await Promise.all([
        api.get('/caskets/', {
          search,
          location: locationFilter,
          status: statusFilter,
          condition: conditionFilter,
        }),
        api.get('/locations/'),
      ]);
      setCaskets(caskRes.results || caskRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading caskets:', err);
    } finally {
      setLoading(false);
    }
  }, [search, locationFilter, statusFilter, conditionFilter]);

  useEffect(() => {
    loadCaskets();
  }, [loadCaskets, pollTick]);

  useEffect(() => {
    const unsub = subscribe('casket.updated', () => loadCaskets());
    return () => unsub();
  }, [subscribe, loadCaskets]);

  const handleOpenStatusModal = (casket) => {
    setStatusCasket(casket);
    setNewStatus(casket.status === 'AVAILABLE' ? 'RESERVED' : 'AVAILABLE');
    setDeceasedName('');
    setContractNumber('');
    setStatusNotes('');
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusLoading(true);
    try {
      await api.post(`/caskets/${statusCasket.id}/change_status/`, {
        status: newStatus,
        deceased_name: deceasedName,
        contract_number: contractNumber,
        notes: statusNotes,
      });
      setStatusCasket(null);
      loadCaskets();
    } catch (err) {
      alert(err.message || 'Failed to update casket status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await api.post('/caskets/', {
        ...createData,
        purchase_cost: parseFloat(createData.purchase_cost) || 0,
        selling_price: parseFloat(createData.selling_price) || 0,
      });
      setIsCreateOpen(false);
      loadCaskets();
    } catch (err) {
      setCreateError(err.message || 'Failed to add casket to inventory.');
    } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      header: 'Casket ID & Model',
      key: 'model',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100 flex items-center gap-2">
            <span>{row.model}</span>
            <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              {row.casket_id}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {row.material} &bull; {row.color} &bull; {row.size}
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      key: 'location_details',
      render: (row) => <span className="font-medium text-slate-200">{row.location_details?.name}</span>,
    },
    {
      header: 'Purchase & Selling Price',
      key: 'price',
      render: (row) => (
        <div>
          <div className="text-xs font-semibold text-slate-100">{formatCurrency(row.selling_price)}</div>
          <div className="text-[11px] text-slate-400">Cost: {formatCurrency(row.purchase_cost)}</div>
        </div>
      ),
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (row) => {
        const meta = CASKET_CONDITION_MAP[row.condition] || { label: row.condition, variant: 'neutral' };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const meta = CASKET_STATUS_MAP[row.status] || { label: row.status, variant: 'neutral' };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenStatusModal(row)}
            icon={Tag}
          >
            Update Status
          </Button>
          <button
            type="button"
            onClick={() => setHistoryCasket(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="View History / Reservations"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            Casket Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor casket stock, reservations for services, repairs, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadCaskets} icon={RefreshCw}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateData({
                casket_id: `CSK-${new Date().getFullYear()}-${String(caskets.length + 1).padStart(3, '0')}`,
                model: '',
                casket_type: 'Wood',
                size: 'Standard Adult',
                color: '',
                material: '',
                supplier: '',
                purchase_cost: '',
                selling_price: '',
                quantity: 1,
                location: locations[0]?.id || '',
                condition: 'NEW',
                status: 'AVAILABLE',
                date_received: new Date().toISOString().split('T')[0],
                notes: '',
              });
              setCreateError('');
              setIsCreateOpen(true);
            }}
            icon={Plus}
          >
            Add Casket
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search model, ID, color, material, supplier..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-40">
            <Select
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <div className="w-36">
            <Select
              options={[
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'RESERVED', label: 'Reserved' },
                { value: 'SOLD', label: 'Sold' },
                { value: 'USED', label: 'Used' },
                { value: 'FOR_REPAIR', label: 'For Repair' },
              ]}
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <div className="w-36">
            <Select
              options={[
                { value: 'NEW', label: 'Brand New' },
                { value: 'GOOD', label: 'Good' },
                { value: 'NEEDS_REPAIR', label: 'Needs Repair' },
                { value: 'DAMAGED', label: 'Damaged' },
              ]}
              placeholder="All Conditions"
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Caskets Table */}
      <DataTable
        columns={columns}
        data={caskets}
        loading={loading}
        emptyTitle="No caskets found"
        emptyDescription="Add caskets to the inventory or adjust filters."
      />

      {/* Change Status Modal */}
      <Modal
        isOpen={!!statusCasket}
        onClose={() => setStatusCasket(null)}
        title="Update Casket Status"
        subtitle={statusCasket ? `${statusCasket.casket_id} - ${statusCasket.model}` : ''}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <Select
            label="Target Status"
            required
            options={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'RESERVED', label: 'Reserved' },
              { value: 'SOLD', label: 'Sold' },
              { value: 'USED', label: 'Used in Service' },
              { value: 'FOR_REPAIR', label: 'For Repair' },
            ]}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />

          {newStatus === 'RESERVED' && (
            <>
              <Input
                label="Deceased / Family Name"
                placeholder="e.g. Santos Family"
                required
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
              />

              <Input
                label="Contract / Service Reference Number"
                placeholder="e.g. AFH-2026-0042"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
              />
            </>
          )}

          <Input
            label="Operational Notes"
            placeholder="Reason for change, inspection notes..."
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setStatusCasket(null)} disabled={statusLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={statusLoading}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Casket Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Casket to Inventory"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Casket ID / Tag"
              required
              value={createData.casket_id}
              onChange={(e) => setCreateData({ ...createData, casket_id: e.target.value })}
            />

            <Select
              label="Location"
              required
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={createData.location}
              onChange={(e) => setCreateData({ ...createData, location: e.target.value })}
            />
          </div>

          <Input
            label="Model Name"
            placeholder="e.g. Presidential Solid Oak, Batesville Classic"
            required
            value={createData.model}
            onChange={(e) => setCreateData({ ...createData, model: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Type"
              options={[
                { value: 'Wood', label: 'Wood' },
                { value: 'Solid Wood', label: 'Solid Wood' },
                { value: 'Metal', label: 'Metal' },
                { value: 'Semi-Metal', label: 'Semi-Metal' },
                { value: 'Cremation', label: 'Cremation' },
                { value: 'Oversized', label: 'Oversized' },
              ]}
              value={createData.casket_type}
              onChange={(e) => setCreateData({ ...createData, casket_type: e.target.value })}
            />

            <Input
              label="Color / Finish"
              placeholder="e.g. Mahogany Gloss"
              value={createData.color}
              onChange={(e) => setCreateData({ ...createData, color: e.target.value })}
            />

            <Input
              label="Material"
              placeholder="e.g. 18-Gauge Steel"
              value={createData.material}
              onChange={(e) => setCreateData({ ...createData, material: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Cost (₱)"
              type="number"
              step="0.01"
              required
              value={createData.purchase_cost}
              onChange={(e) => setCreateData({ ...createData, purchase_cost: e.target.value })}
            />

            <Input
              label="Selling Price (₱)"
              type="number"
              step="0.01"
              required
              value={createData.selling_price}
              onChange={(e) => setCreateData({ ...createData, selling_price: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Condition"
              options={[
                { value: 'NEW', label: 'Brand New' },
                { value: 'GOOD', label: 'Good' },
                { value: 'NEEDS_REPAIR', label: 'Needs Repair' },
                { value: 'DAMAGED', label: 'Damaged' },
              ]}
              value={createData.condition}
              onChange={(e) => setCreateData({ ...createData, condition: e.target.value })}
            />

            <Input
              type="date"
              label="Date Received"
              required
              value={createData.date_received}
              onChange={(e) => setCreateData({ ...createData, date_received: e.target.value })}
            />
          </div>

          <Input
            label="Supplier / Notes"
            placeholder="Supplier name or specifications"
            value={createData.supplier}
            onChange={(e) => setCreateData({ ...createData, supplier: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createLoading}>
              Add Casket
            </Button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={!!historyCasket}
        onClose={() => setHistoryCasket(null)}
        title="Casket Transaction & Reservation History"
        subtitle={historyCasket ? `${historyCasket.casket_id} - ${historyCasket.model}` : ''}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3">
          {(!historyCasket?.history || historyCasket.history.length === 0) ? (
            <p className="text-center py-6 text-xs text-slate-500">No status logs recorded for this casket.</p>
          ) : (
            historyCasket.history.map((h) => (
              <div key={h.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>{h.action} &bull; {h.new_status}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{formatDate(h.created_at)}</span>
                </div>
                {h.deceased_name && (
                  <p className="text-amber-400 font-medium mt-1">Client: {h.deceased_name} (Contract: {h.contract_number || 'N/A'})</p>
                )}
                {h.notes && <p className="text-slate-400 mt-1">{h.notes}</p>}
                <p className="text-[10px] text-slate-500 mt-1">Logged by: {h.user_name || 'Staff'}</p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
