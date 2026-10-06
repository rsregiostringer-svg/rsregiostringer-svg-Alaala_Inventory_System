import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import {
  formatCurrency,
  formatDate,
  CASKET_STATUS_MAP,
  CASKET_CONDITION_MAP,
} from '../utils/formatters';
import {
  Plus,
  RefreshCw,
  Box,
  Tag,
  History,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Heart,
  ShoppingBag,
  Home,
  MapPin,
  Edit3,
  Trash2,
  Settings,
  Download
} from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { handleExportExcel } from '../utils/exportUtils';

export default function CasketsPage() {
  const [caskets, setCaskets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [chapels, setChapels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  // Status Modal
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

  // SELL / ASSIGN CASKET Modal State
  const [sellCasket, setSellCasket] = useState(null);
  const [sellForm, setSellForm] = useState({
    buyer_full_name: '',
    buyer_contact: '',
    buyer_address: '',
    relationship_to_deceased: '',
    buyer_notes: '',

    deceased_full_name: '',
    date_of_death: new Date().toISOString().split('T')[0],
    age: '',
    sex: 'MALE',
    funeral_case_id: '',
    deceased_notes: '',

    chapel_id: '',
    is_residence: false,
    residence_address: '',
    lamay_start_date: new Date().toISOString().split('T')[0],
    lamay_start_time: '18:00',
    expected_burial_date: '',
    burial_time: '09:00',
    service_status: 'ACTIVE',
    selling_price: '',
    notes: '',

    override_conflict: false
  });
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState('');
  const [conflictWarning, setConflictWarning] = useState(null);
  const [sellSuccess, setSellSuccess] = useState('');

  // Quick Chapel Create Modal State
  const [isQuickChapelOpen, setIsQuickChapelOpen] = useState(false);
  const [quickChapelForm, setQuickChapelForm] = useState({
    name: '',
    code: '',
    description: '',
    capacity: 50,
    status: 'AVAILABLE'
  });
  const [quickChapelLoading, setQuickChapelLoading] = useState(false);
  const [quickChapelError, setQuickChapelError] = useState('');

  // Manage Chapels Modal State
  const [isManageChapelsOpen, setIsManageChapelsOpen] = useState(false);
  const [editingChapel, setEditingChapel] = useState(null);
  const [editingChapelLoading, setEditingChapelLoading] = useState(false);
  const [editingChapelError, setEditingChapelError] = useState('');
  const [deletingChapel, setDeletingChapel] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View History & Sales Modal
  const [historyCasket, setHistoryCasket] = useState(null);

  const { user, isMasterAdmin } = useAuth();
  const { pollTick, subscribe } = useRealtime();

  const loadCaskets = useCallback(async () => {
    setLoading(true);
    try {
      const [caskRes, locRes, chapelRes] = await Promise.all([
        api.get('/caskets/', {
          search,
          location: locationFilter,
          status: statusFilter,
          condition: conditionFilter,
        }),
        api.get('/locations/'),
        api.get('/chapels/')
      ]);
      setCaskets(caskRes.results || caskRes);
      setLocations(locRes.results || locRes);
      setChapels(chapelRes.results || chapelRes);
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
    const unsub = subscribe('*', (type) => {
      if (type.startsWith('casket.') || type.startsWith('chapel.') || type.startsWith('lamay.')) {
        loadCaskets();
      }
    });
    return () => unsub();
  }, [subscribe, loadCaskets]);

  const handleOpenSellModal = (casket) => {
    const today = new Date();
    const fourDaysLater = new Date(today);
    fourDaysLater.setDate(today.getDate() + 4);

    setSellCasket(casket);
    setSellForm({
      buyer_full_name: '',
      buyer_contact: '',
      buyer_address: '',
      relationship_to_deceased: 'Next of Kin',
      buyer_notes: '',

      deceased_full_name: '',
      date_of_death: today.toISOString().split('T')[0],
      age: '',
      sex: 'MALE',
      funeral_case_id: `CASE-${today.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      deceased_notes: '',

      chapel_id: chapels[0]?.id || '',
      is_residence: false,
      residence_address: '',
      lamay_start_date: today.toISOString().split('T')[0],
      lamay_start_time: '18:00',
      expected_burial_date: fourDaysLater.toISOString().split('T')[0],
      burial_time: '09:00',
      service_status: 'ACTIVE',
      selling_price: casket.selling_price || 0,
      notes: '',
      override_conflict: false
    });
    setSellError('');
    setConflictWarning(null);
    setSellSuccess('');
  };

  const handleQuickCreateChapel = async (e) => {
    e.preventDefault();
    setQuickChapelLoading(true);
    setQuickChapelError('');
    try {
      const code = quickChapelForm.code.trim() || quickChapelForm.name.toUpperCase().replace(/\s+/g, '-');
      const payload = { ...quickChapelForm, code };
      if ('location' in payload && !payload.location) {
        delete payload.location;
      }
      const res = await api.post('/chapels/', payload);
      const updated = await api.get('/chapels/');
      const list = updated.results || updated;
      setChapels(list);
      setSellForm((prev) => ({ ...prev, chapel_id: res.id, is_residence: false }));
      setIsQuickChapelOpen(false);
      setQuickChapelForm({ name: '', code: '', description: '', capacity: 50, status: 'AVAILABLE' });
    } catch (err) {
      setQuickChapelError(err.message || 'Failed to create chapel.');
    } finally {
      setQuickChapelLoading(false);
    }
  };

  const handleEditChapelSubmit = async (e) => {
    e.preventDefault();
    if (!editingChapel) return;
    setEditingChapelLoading(true);
    setEditingChapelError('');
    try {
      const payload = { ...editingChapel };
      if (typeof payload.location === 'string' || !payload.location) {
        delete payload.location;
      }
      await api.patch(`/chapels/${editingChapel.id}/`, payload);
      const updated = await api.get('/chapels/');
      setChapels(updated.results || updated);
      setEditingChapel(null);
    } catch (err) {
      setEditingChapelError(err.message || 'Failed to update chapel.');
    } finally {
      setEditingChapelLoading(false);
    }
  };

  const handleConfirmDeleteChapel = async () => {
    if (!deletingChapel) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/chapels/${deletingChapel.id}/`);
      const updated = await api.get('/chapels/');
      setChapels(updated.results || updated);
      setDeletingChapel(null);
      if (res?.detail) alert(res.detail);
    } catch (err) {
      alert(err.message || 'Failed to delete chapel.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    setSellLoading(true);
    setSellError('');
    setConflictWarning(null);

    if (!sellForm.buyer_full_name.trim()) {
      setSellError('Buyer Full Name is required.');
      setSellLoading(false);
      return;
    }
    if (!sellForm.deceased_full_name.trim()) {
      setSellError('Deceased Full Name is required.');
      setSellLoading(false);
      return;
    }

    try {
      const payload = {
        buyer_full_name: sellForm.buyer_full_name,
        buyer_contact: sellForm.buyer_contact,
        buyer_address: sellForm.buyer_address,
        relationship_to_deceased: sellForm.relationship_to_deceased,
        buyer_notes: sellForm.buyer_notes,

        deceased_full_name: sellForm.deceased_full_name,
        date_of_death: sellForm.date_of_death || null,
        age: sellForm.age ? parseInt(sellForm.age, 10) : null,
        sex: sellForm.sex,
        funeral_case_id: sellForm.funeral_case_id,
        deceased_notes: sellForm.deceased_notes,

        chapel_id: sellForm.is_residence ? null : (sellForm.chapel_id === 'RESIDENCE' ? null : sellForm.chapel_id),
        is_residence: sellForm.is_residence || sellForm.chapel_id === 'RESIDENCE',
        residence_address: sellForm.residence_address,
        lamay_start_date: sellForm.lamay_start_date,
        lamay_start_time: sellForm.lamay_start_time,
        expected_burial_date: sellForm.expected_burial_date || null,
        burial_time: sellForm.burial_time,
        service_status: sellForm.service_status,
        selling_price: parseFloat(sellForm.selling_price) || 0,
        notes: sellForm.notes,
        override_conflict: sellForm.override_conflict
      };

      const res = await api.post(
        `/caskets/${sellCasket.id}/sell_or_assign/`,
        payload
      );

      setSellSuccess(`Sale completed. Service ID: ${res.lamay_id}`);
      setTimeout(() => {
        setSellCasket(null);
        setSellSuccess('');
        loadCaskets();
      }, 1400);
    } catch (err) {
      if (err.data?.conflict) {
        setConflictWarning(err.data);
      } else {
        setSellError(err.message || 'Failed to record casket sale.');
      }
    } finally {
      setSellLoading(false);
    }
  };

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
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            <span>{row.model}</span>
            <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              {row.casket_id}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {row.material} &bull; {row.color} &bull; {row.size}
          </div>
        </div>
      ),
    },
    {
      header: 'Location & Stock',
      key: 'location_details',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800 block">{row.location_details?.name}</span>
          <span className="text-xs font-mono text-slate-500">Qty: {row.quantity} units</span>
        </div>
      ),
    },
    {
      header: 'Selling & Cost Price',
      key: 'price',
      render: (row) => (
        <div>
          <div className="text-xs font-bold text-slate-900">{formatCurrency(row.selling_price)}</div>
          <div className="text-[11px] text-slate-500">Cost: {formatCurrency(row.purchase_cost)}</div>
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
        return (
          <div>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {row.sales && row.sales.length > 0 && (
              <span className="block text-[11px] text-slate-500 font-mono mt-0.5">
                {row.sales.length} sale record{row.sales.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {row.quantity > 0 && row.status !== 'FOR_REPAIR' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenSellModal(row)}
              icon={ShoppingBag}
            >
              Sell / Assign
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenStatusModal(row)}
            icon={Tag}
          >
            Status
          </Button>

          <button
            type="button"
            onClick={() => setHistoryCasket(row)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="View History, Sales & Reservations"
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
          <h1 className="text-2xl font-bold text-slate-900">
            Caskets Inventory & Sales
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage casket intake, pricing, buyer & deceased assignments, and wake connections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await handleExportExcel('caskets', { location: locationFilter, search, status: statusFilter, condition: conditionFilter }, 'caskets');
              } catch (e) {
                alert('Export failed.');
              }
            }}
            icon={Download}
          >
            Export CSV
          </Button>
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
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search Casket ID, Model, Buyer, Deceased, Chapel, Service ID..."
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

      {/* SELL / ASSIGN CASKET MODAL */}
      <Modal
        isOpen={Boolean(sellCasket)}
        onClose={() => setSellCasket(null)}
        title="Sell / Assign Casket Record"
        subtitle={`Record sales and connect Buyer, Deceased, and Chapel monitoring for ${sellCasket?.model}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSellSubmit} className="space-y-4">
          {sellError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{sellError}</span>
            </div>
          )}

          {conflictWarning && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>CHAPEL DOUBLE BOOKING WARNING</span>
              </div>
              <p>{conflictWarning.detail}</p>
              {isMasterAdmin && (
                <label className="flex items-center gap-2 pt-1 font-semibold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sellForm.override_conflict}
                    onChange={(e) => setSellForm({ ...sellForm, override_conflict: e.target.checked })}
                    className="rounded border-amber-400 text-[#0866FF] focus:ring-[#0866FF]"
                  />
                  <span>Master Admin Override: Authorize concurrent chapel service</span>
                </label>
              )}
            </div>
          )}

          {sellSuccess && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sellSuccess}</span>
            </div>
          )}

          {/* 1. CASKET INFORMATION */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-blue-600" />
                1. Casket Information
              </span>
              <span className="font-mono text-blue-600 font-bold">{sellCasket?.casket_id}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
              <div>
                <span className="text-[11px] text-slate-500 block">Model:</span>
                <span className="font-semibold text-slate-900">{sellCasket?.model}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Type & Size:</span>
                <span>{sellCasket?.casket_type} &bull; {sellCasket?.size}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Location:</span>
                <span>{sellCasket?.location_details?.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Available Qty:</span>
                <span className="font-bold text-blue-600 font-mono">{sellCasket?.quantity} units</span>
              </div>
            </div>
          </div>

          {/* 2. BUYER INFORMATION */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              2. Buyer Information (Purchaser / Family Contact)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Buyer Full Name"
                required
                placeholder="e.g. Juan Dela Cruz"
                value={sellForm.buyer_full_name}
                onChange={(e) => setSellForm({ ...sellForm, buyer_full_name: e.target.value })}
              />

              <Input
                label="Buyer Contact Number"
                required
                placeholder="e.g. 0917-123-4567"
                value={sellForm.buyer_contact}
                onChange={(e) => setSellForm({ ...sellForm, buyer_contact: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Relationship to Deceased"
                placeholder="e.g. Son, Daughter, Spouse, Sibling"
                value={sellForm.relationship_to_deceased}
                onChange={(e) => setSellForm({ ...sellForm, relationship_to_deceased: e.target.value })}
              />

              <Input
                label="Buyer Address"
                placeholder="Barangay / City, Province"
                value={sellForm.buyer_address}
                onChange={(e) => setSellForm({ ...sellForm, buyer_address: e.target.value })}
              />
            </div>
          </div>

          {/* 3. DECEASED INFORMATION */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-600" />
              3. Deceased Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Deceased Full Name"
                  required
                  placeholder="e.g. Pedro Dela Cruz"
                  value={sellForm.deceased_full_name}
                  onChange={(e) => setSellForm({ ...sellForm, deceased_full_name: e.target.value })}
                />
              </div>

              <Input
                type="date"
                label="Date of Death"
                value={sellForm.date_of_death}
                onChange={(e) => setSellForm({ ...sellForm, date_of_death: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="number"
                label="Age"
                placeholder="Age in years"
                value={sellForm.age}
                onChange={(e) => setSellForm({ ...sellForm, age: e.target.value })}
              />

              <Select
                label="Sex"
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                value={sellForm.sex}
                onChange={(e) => setSellForm({ ...sellForm, sex: e.target.value })}
              />

              <Input
                label="Funeral Case / Service ID"
                placeholder="e.g. CASE-2026-1003"
                value={sellForm.funeral_case_id}
                onChange={(e) => setSellForm({ ...sellForm, funeral_case_id: e.target.value })}
              />
            </div>
          </div>

          {/* 4. SERVICE & CHAPEL INFORMATION */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                4. Service & Chapel Assignment
              </span>

              {/* Venue Selector Pills */}
              <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    const firstChapel = chapels[0]?.id || '';
                    setSellForm((prev) => ({ ...prev, is_residence: false, chapel_id: firstChapel }));
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${!sellForm.is_residence && sellForm.chapel_id !== 'RESIDENCE'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Funeral Chapel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellForm((prev) => ({
                      ...prev,
                      is_residence: true,
                      chapel_id: 'RESIDENCE',
                      residence_address: prev.residence_address || prev.buyer_address || ''
                    }));
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${sellForm.is_residence || sellForm.chapel_id === 'RESIDENCE'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Residence Viewing
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-800">
                    Assigned Venue <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsQuickChapelOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                    <span className="text-slate-500 text-xs">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setIsManageChapelsOpen(true)}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Settings className="w-3 h-3" />
                      Manage
                    </button>
                  </div>
                </div>
                <select
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-blue-600 transition-colors"
                  value={sellForm.is_residence ? 'RESIDENCE' : sellForm.chapel_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'RESIDENCE') {
                      setSellForm((prev) => ({
                        ...prev,
                        is_residence: true,
                        chapel_id: 'RESIDENCE',
                        residence_address: prev.residence_address || prev.buyer_address || ''
                      }));
                    } else {
                      setSellForm((prev) => ({
                        ...prev,
                        is_residence: false,
                        chapel_id: val
                      }));
                    }
                  }}
                >
                  <option value="RESIDENCE">Residence / House Viewing (In Family Home)</option>
                  <optgroup label="Funeral Home Chapels">
                    {chapels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status_display || c.status})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <Input
                label="Selling Price (₱)"
                type="number"
                step="0.01"
                required
                value={sellForm.selling_price}
                onChange={(e) => setSellForm({ ...sellForm, selling_price: e.target.value })}
              />

              <Select
                label="Service Status"
                options={[
                  { value: 'ACTIVE', label: 'Active Lamay (Start Now)' },
                  { value: 'RESERVED', label: 'Reserved / Preparing' },
                ]}
                value={sellForm.service_status}
                onChange={(e) => setSellForm({ ...sellForm, service_status: e.target.value })}
              />
            </div>

            {/* Residence Address Input */}
            {(sellForm.is_residence || sellForm.chapel_id === 'RESIDENCE') && (
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                    <Home className="w-3.5 h-3.5 text-blue-600" />
                    <span>Residence / Private Home Viewing Details</span>
                  </div>
                  {sellForm.buyer_address && (
                    <button
                      type="button"
                      onClick={() => setSellForm((prev) => ({ ...prev, residence_address: prev.buyer_address }))}
                      className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      Use Buyer Address
                    </button>
                  )}
                </div>
                <Input
                  label="Residence / Viewing Address"
                  required
                  placeholder="e.g. 123 Sampaguita St., Brgy. San Jose"
                  value={sellForm.residence_address}
                  onChange={(e) => setSellForm({ ...sellForm, residence_address: e.target.value })}
                />
                <p className="text-[11px] text-slate-500">
                  Note: Wake is held in the family residence. No chapel facility will be occupied.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                type="date"
                label="Lamay Start Date"
                required
                value={sellForm.lamay_start_date}
                onChange={(e) => setSellForm({ ...sellForm, lamay_start_date: e.target.value })}
              />

              <Input
                type="time"
                label="Start Time"
                value={sellForm.lamay_start_time}
                onChange={(e) => setSellForm({ ...sellForm, lamay_start_time: e.target.value })}
              />

              <Input
                type="date"
                label="Expected Burial Date"
                value={sellForm.expected_burial_date}
                onChange={(e) => setSellForm({ ...sellForm, expected_burial_date: e.target.value })}
              />

              <Input
                type="time"
                label="Burial Time"
                value={sellForm.burial_time}
                onChange={(e) => setSellForm({ ...sellForm, burial_time: e.target.value })}
              />
            </div>
          </div>

          {/* 5. ENCODING INFORMATION */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center text-slate-600">
            <div>
              <span>Encoded By: </span>
              <strong className="text-slate-900">{user?.username}</strong>
            </div>
            <div>
              <span>Date/Time: </span>
              <strong className="text-slate-900 font-mono">{new Date().toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSellCasket(null)}
              disabled={sellLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={sellLoading}
              icon={CheckCircle2}
            >
              Record Sale & Assign
            </Button>
          </div>
        </form>
      </Modal>

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

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setStatusCasket(null)} disabled={statusLoading}>
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
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

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createLoading}>
              Add Casket
            </Button>
          </div>
        </form>
      </Modal>

      {/* History & Sales Modal */}
      <Modal
        isOpen={!!historyCasket}
        onClose={() => setHistoryCasket(null)}
        title="Casket History & Sales Record"
        subtitle={historyCasket ? `${historyCasket.casket_id} - ${historyCasket.model}` : ''}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Sales records summary */}
          {historyCasket?.sales && historyCasket.sales.length > 0 && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Sales & Deceased Linkage Records
              </span>
              {historyCasket.sales.map((s) => (
                <div key={s.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1 shadow-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{s.sale_id}</span>
                    <span className="text-blue-600 font-bold">{formatCurrency(s.selling_price)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p><span className="text-slate-500">Buyer:</span> {s.buyer_name}</p>
                    <p><span className="text-slate-500">Deceased:</span> {s.deceased_name}</p>
                    <p><span className="text-slate-500">Chapel:</span> {s.chapel_name || 'N/A'}</p>
                    <p><span className="text-slate-500">Date:</span> {formatDate(s.date_sold)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transaction logs */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Movement & Status Audit Trail
            </span>
            {(!historyCasket?.history || historyCasket.history.length === 0) ? (
              <p className="text-center py-6 text-xs text-slate-500">No status logs recorded for this casket.</p>
            ) : (
              historyCasket.history.map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{h.action} &bull; {h.new_status}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{formatDate(h.created_at)}</span>
                  </div>
                  {h.deceased_name && (
                    <p className="text-slate-900 font-medium mt-1">Client: {h.deceased_name} (Contract: {h.contract_number || 'N/A'})</p>
                  )}
                  {h.notes && <p className="text-slate-600 mt-1">{h.notes}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">Logged by: {h.user_name || 'Staff'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Quick Add Chapel Modal */}
      <Modal
        isOpen={isQuickChapelOpen}
        onClose={() => setIsQuickChapelOpen(false)}
        title="Add Chapel Unit"
        subtitle="Quickly add a new viewing chapel"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickCreateChapel} className="space-y-4">
          {quickChapelError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {quickChapelError}
            </div>
          )}

          <Input
            label="Chapel Name"
            placeholder="e.g. Chapel 3 - St. Peter"
            required
            value={quickChapelForm.name}
            onChange={(e) => setQuickChapelForm({ ...quickChapelForm, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Chapel Code"
              placeholder="e.g. CHAPEL-3"
              value={quickChapelForm.code}
              onChange={(e) => setQuickChapelForm({ ...quickChapelForm, code: e.target.value.toUpperCase() })}
            />

            <Input
              label="Capacity (Persons)"
              type="number"
              min={1}
              required
              value={quickChapelForm.capacity}
              onChange={(e) => setQuickChapelForm({ ...quickChapelForm, capacity: parseInt(e.target.value, 10) || 50 })}
            />
          </div>

          <Input
            label="Description / Special Features (Optional)"
            placeholder="e.g. Private family room"
            value={quickChapelForm.description}
            onChange={(e) => setQuickChapelForm({ ...quickChapelForm, description: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsQuickChapelOpen(false)}
              disabled={quickChapelLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={quickChapelLoading}
              icon={Plus}
            >
              Create Chapel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Chapels Modal */}
      <Modal
        isOpen={isManageChapelsOpen}
        onClose={() => setIsManageChapelsOpen(false)}
        title="Manage Facility Chapels"
        subtitle="Add, edit, or remove chapel viewing rooms"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total Chapels: <strong className="text-slate-800">{chapels.length}</strong>
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsQuickChapelOpen(true)}
            >
              Add Chapel
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="p-3">Chapel Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {chapels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No chapels registered yet.
                    </td>
                  </tr>
                ) : (
                  chapels.map((ch) => (
                    <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-900">
                        {ch.name}
                        {ch.location && <span className="block text-[11px] text-slate-500">{ch.location}</span>}
                      </td>
                      <td className="p-3 font-mono text-slate-700">{ch.code || '—'}</td>
                      <td className="p-3 font-mono">{ch.capacity} pax</td>
                      <td className="p-3">
                        <Badge variant={ch.status === 'AVAILABLE' ? 'blue' : ch.status === 'OCCUPIED' ? 'red' : 'yellow'}>
                          {ch.status_display || ch.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingChapel({ ...ch })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Chapel"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingChapel(ch)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Chapel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsManageChapelsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Chapel Modal */}
      <Modal
        isOpen={Boolean(editingChapel)}
        onClose={() => setEditingChapel(null)}
        title="Edit Chapel Details"
        subtitle={editingChapel ? `Updating ${editingChapel.name}` : ''}
        maxWidth="max-w-md"
      >
        {editingChapel && (
          <form onSubmit={handleEditChapelSubmit} className="space-y-4">
            {editingChapelError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {editingChapelError}
              </div>
            )}

            <Input
              label="Chapel Name"
              required
              value={editingChapel.name || ''}
              onChange={(e) => setEditingChapel({ ...editingChapel, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Chapel Code"
                value={editingChapel.code || ''}
                onChange={(e) => setEditingChapel({ ...editingChapel, code: e.target.value.toUpperCase() })}
              />

              <Input
                label="Capacity (Persons)"
                type="number"
                min={1}
                required
                value={editingChapel.capacity || 50}
                onChange={(e) => setEditingChapel({ ...editingChapel, capacity: parseInt(e.target.value, 10) || 50 })}
              />
            </div>

            <Select
              label="Current Status"
              options={[
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'OCCUPIED', label: 'Occupied' },
                { value: 'CLEANING', label: 'Cleaning' },
                { value: 'RESERVED', label: 'Reserved' },
                { value: 'MAINTENANCE', label: 'Maintenance / Out of Service' },
              ]}
              value={editingChapel.status || 'AVAILABLE'}
              onChange={(e) => setEditingChapel({ ...editingChapel, status: e.target.value })}
            />

            <Input
              label="Description / Special Features"
              value={editingChapel.description || ''}
              onChange={(e) => setEditingChapel({ ...editingChapel, description: e.target.value })}
            />

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingChapel(null)}
                disabled={editingChapelLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={editingChapelLoading}
                icon={CheckCircle2}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Chapel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingChapel)}
        onClose={() => setDeletingChapel(null)}
        onConfirm={handleConfirmDeleteChapel}
        title="Delete Chapel Unit"
        message={`Are you sure you want to delete ${deletingChapel?.name}?`}
        confirmText="Delete Chapel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
