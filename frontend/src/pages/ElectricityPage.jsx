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
import { formatCurrency, formatDate, PAYMENT_STATUS_MAP } from '../utils/formatters';
import { Plus, RefreshCw, Zap } from 'lucide-react';

export default function ElectricityPage() {
  const [bills, setBills] = useState([]);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [formData, setFormData] = useState({
    location: '',
    provider: 'Meralco',
    meter_number: '',
    previous_reading: '',
    current_reading: '',
    billing_period: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    payment_status: 'UNPAID',
    date_paid: '',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { pollTick, subscribe } = useRealtime();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, sumRes, locRes] = await Promise.all([
        api.get('/electricity/', {
          search,
          location: locationFilter,
          payment_status: statusFilter,
        }),
        api.get('/electricity/summary/', {
          location: locationFilter,
          payment_status: statusFilter,
        }),
        api.get('/locations/'),
      ]);
      setBills(billsRes.results || billsRes);
      setSummary(sumRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading electricity bills:', err);
    } finally {
      setLoading(false);
    }
  }, [search, locationFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData, pollTick]);

  useEffect(() => {
    const unsub = subscribe('electricity.updated', () => loadData());
    return () => unsub();
  }, [subscribe, loadData]);

  const handleOpenCreate = () => {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 15);

    setFormData({
      location: locations[0]?.id || '',
      provider: 'Meralco',
      meter_number: '',
      previous_reading: '',
      current_reading: '',
      billing_period: `${today.toLocaleString('en-US', { month: 'long' })} ${today.getFullYear()}`,
      bill_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      amount: '',
      payment_status: 'UNPAID',
      date_paid: '',
      notes: '',
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (bill) => {
    setFormData({
      location: bill.location,
      provider: bill.provider,
      meter_number: bill.meter_number,
      previous_reading: bill.previous_reading,
      current_reading: bill.current_reading,
      billing_period: bill.billing_period,
      bill_date: bill.bill_date,
      due_date: bill.due_date,
      amount: bill.amount,
      payment_status: bill.payment_status,
      date_paid: bill.date_paid || '',
      notes: bill.notes || '',
    });
    setEditBill(bill);
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        ...formData,
        previous_reading: parseFloat(formData.previous_reading) || 0,
        current_reading: parseFloat(formData.current_reading) || 0,
        amount: parseFloat(formData.amount) || 0,
        date_paid: formData.payment_status === 'PAID' && !formData.date_paid
          ? new Date().toISOString().split('T')[0]
          : formData.date_paid || null,
      };

      if (editBill) {
        await api.put(`/electricity/${editBill.id}/`, payload);
        setEditBill(null);
      } else {
        await api.post('/electricity/', payload);
        setIsCreateOpen(false);
      }
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to save electricity bill.');
    } finally {
      setFormLoading(false);
    }
  };

  const calculatedConsumption =
    parseFloat(formData.current_reading || 0) - parseFloat(formData.previous_reading || 0);

  const columns = [
    {
      header: 'Location & Period',
      key: 'location_details',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100">{row.location_details?.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {row.billing_period} &bull; {row.provider}
          </div>
        </div>
      ),
    },
    {
      header: 'Meter & Readings',
      key: 'meter_number',
      render: (row) => (
        <div>
          <div className="font-mono text-xs text-black-300">Meter: {row.meter_number}</div>
          <div className="text-[11px] text-black-500">
            {row.previous_reading} &rarr; {row.current_reading}
          </div>
        </div>
      ),
    },
    {
      header: 'Consumption',
      key: 'consumption',
      render: (row) => (
        <span className="font-bold text-blue-500">
          {row.consumption} <span className="text-xs font-normal text--400">kWh</span>
        </span>
      ),
    },
    {
      header: 'Amount Due',
      key: 'amount',
      render: (row) => (
        <div>
          <div className="text-xs font-bold text-black-100">{formatCurrency(row.amount)}</div>
          <div className="text-[11px] text-black-400">Due: {formatDate(row.due_date)}</div>
        </div>
      ),
    },
    {
      header: 'Payment Status',
      key: 'payment_status',
      render: (row) => {
        const meta = PAYMENT_STATUS_MAP[row.payment_status] || { label: row.payment_status, variant: 'neutral' };
        return (
          <div>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {row.date_paid && (
              <div className="text-[10px] text-slate-500 mt-0.5">Paid {formatDate(row.date_paid)}</div>
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
        <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(row)}>
          Edit / Pay
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-yellow-600 tracking-wide">
            Electricity Utility Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track electrical power consumption (kWh), meter readings, bills, and payments across chapels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} icon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={Plus}>
            Record Bill
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 uppercase font-medium">Total Billed</span>
            <div className="mt-1 text-xl font-bold text-slate-100">{formatCurrency(summary.total_amount)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 uppercase font-medium">Total Consumption</span>
            <div className="mt-1 text-xl font-bold text-blue-500">{summary.total_consumption.toFixed(1)} kWh</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 uppercase font-medium">Unpaid Bills</span>
            <div className="mt-1 text-xl font-bold text-rose-400">{summary.unpaid_count} bills</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 uppercase font-medium">Unpaid Amount</span>
            <div className="mt-1 text-xl font-bold text-rose-400">{formatCurrency(summary.unpaid_amount)}</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-700 border border-slate-200 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search meter number, billing period..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-44">
            <Select
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <div className="w-40">
            <Select
              options={[
                { value: 'UNPAID', label: 'Unpaid' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              ]}
              placeholder="All Payments"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={bills}
        loading={loading}
        emptyTitle="No electricity bills found"
        emptyDescription="Add electric bill records to start tracking consumption."
        emptyActionLabel="Record Electricity Bill"
        onEmptyAction={handleOpenCreate}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateOpen || !!editBill}
        onClose={() => {
          setIsCreateOpen(false);
          setEditBill(null);
        }}
        title={editBill ? 'Update Electricity Bill' : 'Record Electricity Bill'}
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
              label="Location / Chapel"
              required
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />

            <Input
              label="Provider"
              required
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Electric Meter Number"
              required
              value={formData.meter_number}
              onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
              placeholder="e.g. MER-901124"
            />

            <Input
              label="Billing Period"
              required
              value={formData.billing_period}
              onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
              placeholder="e.g. October 2026"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Previous reading"
              type="number"
              step="0.01"
              required
              value={formData.previous_reading}
              onChange={(e) => setFormData({ ...formData, previous_reading: e.target.value })}
            />

            <Input
              label="Current reading"
              type="number"
              step="0.01"
              required
              value={formData.current_reading}
              onChange={(e) => setFormData({ ...formData, current_reading: e.target.value })}
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">actual consumption</label>
              <div className="px-3.5 py-2 rounded-lg bg-[#F0F2F5] border border-slate-200 text-sm font-bold text-blue-500">
                {calculatedConsumption > 0 ? calculatedConsumption.toFixed(2) : 0} kWh
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bill Amount (₱)"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />

            <Select
              label="Payment Status"
              required
              options={[
                { value: 'UNPAID', label: 'Unpaid' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              ]}
              value={formData.payment_status}
              onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Date of Meter Reading"
              required
              value={formData.bill_date}
              onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
            />

            <Input
              type="date"
              label="Date of Next Reading"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {formData.payment_status === 'PAID' && (
            <Input
              type="date"
              label="Date Paid"
              value={formData.date_paid}
              onChange={(e) => setFormData({ ...formData, date_paid: e.target.value })}
            />
          )}

          <Input
            label="Notes / Receipt Reference"
            placeholder="Official Receipt number, check #..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setEditBill(null);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading}>
              {editBill ? 'Update Bill' : 'Save Electricity Bill'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
