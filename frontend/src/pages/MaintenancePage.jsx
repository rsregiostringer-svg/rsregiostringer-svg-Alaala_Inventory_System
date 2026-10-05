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
import { formatCurrency, formatDate, MAINTENANCE_STATUS_MAP, MAINTENANCE_PRIORITY_MAP } from '../utils/formatters';
import { Plus, RefreshCw, Wrench, Edit3, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  'Electrical', 'Plumbing', 'Water', 'Air Conditioning', 'Lighting',
  'Furniture', 'Doors/Locks', 'Ceiling/Roof', 'Walls/Paint',
  'Bathroom', 'Cleaning', 'Equipment', 'Other'
];

export default function MaintenancePage() {
  const [tickets, setTickets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [formData, setFormData] = useState({
    location: '',
    category: 'Air Conditioning',
    issue: '',
    description: '',
    priority: 'MEDIUM',
    reported_by: '',
    date_reported: new Date().toISOString().split('T')[0],
    assigned_to: '',
    target_date: '',
    status: 'REPORTED',
    cost: '0.00',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { pollTick, subscribe } = useRealtime();

  const loadMaintenance = useCallback(async () => {
    setLoading(true);
    try {
      const [maintRes, locRes] = await Promise.all([
        api.get('/maintenance/', {
          search,
          location: selectedLocation,
          category: selectedCategory,
          priority: selectedPriority,
          status: selectedStatus,
        }),
        api.get('/locations/'),
      ]);
      setTickets(maintRes.results || maintRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading maintenance:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedLocation, selectedCategory, selectedPriority, selectedStatus]);

  useEffect(() => {
    loadMaintenance();
  }, [loadMaintenance, pollTick]);

  useEffect(() => {
    const unsub = subscribe('maintenance.updated', () => loadMaintenance());
    return () => unsub();
  }, [subscribe, loadMaintenance]);

  const handleOpenCreate = () => {
    setFormData({
      location: locations[0]?.id || '',
      category: 'Air Conditioning',
      issue: '',
      description: '',
      priority: 'MEDIUM',
      reported_by: '',
      date_reported: new Date().toISOString().split('T')[0],
      assigned_to: '',
      target_date: '',
      status: 'REPORTED',
      cost: '0.00',
      notes: '',
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (ticket) => {
    setFormData({
      location: ticket.location,
      category: ticket.category,
      issue: ticket.issue,
      description: ticket.description,
      priority: ticket.priority,
      reported_by: ticket.reported_by,
      date_reported: ticket.date_reported,
      assigned_to: ticket.assigned_to || '',
      target_date: ticket.target_date || '',
      status: ticket.status,
      cost: ticket.cost,
      notes: ticket.notes || '',
    });
    setEditTicket(ticket);
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.issue.trim()) {
      setFormError('Issue title is required.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (editTicket) {
        await api.put(`/maintenance/${editTicket.id}/`, {
          ...formData,
          cost: parseFloat(formData.cost) || 0,
        });
        setEditTicket(null);
      } else {
        await api.post('/maintenance/', {
          ...formData,
          cost: parseFloat(formData.cost) || 0,
        });
        setIsCreateOpen(false);
      }
      loadMaintenance();
    } catch (err) {
      setFormError(err.message || 'Failed to save maintenance ticket.');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Ticket ID & Issue',
      key: 'issue',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100 flex items-center gap-2">
            <span>{row.issue}</span>
            <span className="font-mono text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {row.maintenance_id}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {row.category} &bull; Reported {formatDate(row.date_reported)} by {row.reported_by}
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
      header: 'Priority',
      key: 'priority',
      render: (row) => {
        const meta = MAINTENANCE_PRIORITY_MAP[row.priority] || { label: row.priority, variant: 'neutral' };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      header: 'Assigned / Cost',
      key: 'assigned_to',
      render: (row) => (
        <div>
          <div className="text-xs text-slate-200">{row.assigned_to || 'Unassigned'}</div>
          <div className="text-[11px] text-amber-400/90 font-mono">Cost: {formatCurrency(row.cost)}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const meta = MAINTENANCE_STATUS_MAP[row.status] || { label: row.status, variant: 'neutral' };
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
            onClick={() => handleOpenEdit(row)}
            icon={Edit3}
          >
            Update
          </Button>
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
            Chapel & Facility Maintenance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log and resolve facility issues (AC, plumbing, electrical, fixtures) across viewing chapels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadMaintenance} icon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={Plus}>
            Report Issue
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search ticket ID, issue, technician..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-40">
            <Select
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            />
          </div>

          <div className="w-40">
            <Select
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              placeholder="All Categories"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            />
          </div>

          <div className="w-32">
            <Select
              options={[
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
              placeholder="All Priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            />
          </div>

          <div className="w-36">
            <Select
              options={[
                { value: 'REPORTED', label: 'Reported' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'FOR_REPAIR', label: 'For Repair' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              placeholder="All Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Maintenance Table */}
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        emptyTitle="No maintenance tickets found"
        emptyDescription="All chapel facilities and equipment are currently operating normally."
        emptyActionLabel="Report Maintenance Issue"
        onEmptyAction={handleOpenCreate}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateOpen || !!editTicket}
        onClose={() => {
          setIsCreateOpen(false);
          setEditTicket(null);
        }}
        title={editTicket ? `Update Ticket: ${editTicket.maintenance_id}` : 'Report Facility Maintenance'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Chapel / Facility Location"
              required
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />

            <Select
              label="Issue Category"
              required
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <Input
            label="Issue Headline"
            placeholder="e.g. Split AC Unit #2 blowing warm air"
            required
            value={formData.issue}
            onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
          />

          <Input
            label="Detailed Description"
            placeholder="Describe the issue, symptoms, and urgency..."
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              required
              options={[
                { value: 'LOW', label: 'Low (Scheduled Maintenance)' },
                { value: 'MEDIUM', label: 'Medium (Standard)' },
                { value: 'HIGH', label: 'High (Immediate Attention)' },
                { value: 'URGENT', label: 'Urgent (Affecting Viewing Service)' },
              ]}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            />

            <Select
              label="Status"
              required
              options={[
                { value: 'REPORTED', label: 'Reported' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'FOR_REPAIR', label: 'For Repair' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Reported By"
              placeholder="Staff / Inspector Name"
              required
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
            />

            <Input
              label="Assigned Technician / Contractor"
              placeholder="e.g. CoolTech Air Solutions"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Date Reported"
              required
              value={formData.date_reported}
              onChange={(e) => setFormData({ ...formData, date_reported: e.target.value })}
            />

            <Input
              label="Repair Cost (₱)"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          </div>

          <Input
            label="Additional Notes / Invoice Ref"
            placeholder="Invoice #, parts replaced, warranty info..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setEditTicket(null);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading}>
              {editTicket ? 'Save Changes' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
