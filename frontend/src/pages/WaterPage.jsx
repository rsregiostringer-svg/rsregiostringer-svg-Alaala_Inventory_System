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
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, RefreshCw, Droplet, Download, Trash2, AlertCircle } from 'lucide-react';
import { handleExportExcel } from '../utils/exportUtils';
import { useAuth } from '../contexts/AuthContext';

const WATER_SOURCES = [
  { value: 'PrimeWater', label: 'PrimeWater' },
  { value: 'Deepwell', label: 'Deepwell' },
  { value: 'Maynilad Water Services', label: 'Maynilad Water Services' },
  { value: 'Manila Water', label: 'Manila Water' },
];

const SHIFTS = [
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Night', label: 'Night' },
];

export default function WaterPage() {
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  
  const getDefaultForm = () => ({
    date: new Date().toISOString().split('T')[0],
    water_source: 'Deepwell',
    location: '',
    patient_name: '',
    shift: 'Morning',
    tank: '',
    initial_level: '',
    initial_additional: '',
    initial_checked_by: user?.first_name ? `${user.first_name} ${user.last_name}` : '',
    initial_remarks: '',
    subsequent_level: '',
    subsequent_additional: '',
    subsequent_checked_by: '',
    subsequent_remarks: '',
    refilled_gallons: '',
    flag_status: ''
  });

  const [forms, setForms] = useState([getDefaultForm()]);
  
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { pollTick, subscribe } = useRealtime();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, locRes] = await Promise.all([
        api.get('/water/', {
          search,
          location: locationFilter,
          water_source: sourceFilter,
          date: dateFilter,
        }),
        api.get('/locations/'),
      ]);
      setRecords(recordsRes.results || recordsRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading water records:', err);
    } finally {
      setLoading(false);
    }
  }, [search, locationFilter, sourceFilter, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData, pollTick]);

  useEffect(() => {
    const unsub = subscribe('water.updated', () => loadData());
    return () => unsub();
  }, [subscribe, loadData]);

  const handleOpenCreate = () => {
    setForms([{...getDefaultForm(), location: locations[0]?.id || ''}]);
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (record) => {
    setForms([{
      id: record.id,
      date: record.date || '',
      water_source: record.water_source || 'Deepwell',
      location: record.location || '',
      patient_name: record.patient_name || '',
      shift: record.shift || 'Morning',
      tank: record.tank || '',
      initial_level: record.initial_level ?? '',
      initial_additional: record.initial_additional ?? '',
      initial_checked_by: record.initial_checked_by || '',
      initial_remarks: record.initial_remarks || '',
      subsequent_level: record.subsequent_level ?? '',
      subsequent_additional: record.subsequent_additional ?? '',
      subsequent_checked_by: record.subsequent_checked_by || '',
      subsequent_remarks: record.subsequent_remarks || '',
      refilled_gallons: record.refilled_gallons ?? '',
      flag_status: record.flag_status || ''
    }]);
    setEditRecord(record);
    setFormError('');
    setIsCreateOpen(true);
  };

  const addTankForm = () => {
    if (forms.length > 0) {
      const last = forms[forms.length - 1];
      setForms([...forms, {
        ...getDefaultForm(),
        date: last.date,
        water_source: last.water_source,
        location: last.location,
        patient_name: last.patient_name,
        shift: last.shift
      }]);
    } else {
      setForms([getDefaultForm()]);
    }
  };

  const removeTankForm = (index) => {
    setForms(forms.filter((_, i) => i !== index));
  };

  const updateForm = (index, field, value) => {
    setForms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payloads = forms.map(f => {
        const payload = { ...f };
        ['initial_level', 'initial_additional', 'subsequent_level', 'subsequent_additional', 'refilled_gallons'].forEach(key => {
            if (payload[key] === '') payload[key] = null;
            else if (payload[key] !== null) payload[key] = parseFloat(payload[key]);
        });
        return payload;
      });

      if (editRecord) {
        await api.put(`/water/${editRecord.id}/`, payloads[0]);
      } else {
        await api.post('/water/bulk_create/', payloads);
      }
      setIsCreateOpen(false);
      setEditRecord(null);
      loadData();
    } catch (err) {
      let msg = err.message || 'Failed to save water records.';
      if (err.response && err.response.data) {
          if (Array.isArray(err.response.data)) {
            msg = err.response.data.map(d => JSON.stringify(d)).join(', ');
          } else {
            msg = JSON.stringify(err.response.data);
          }
      }
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Date & Location',
      key: 'location_details',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{formatDate(row.date)}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {row.location_details?.name || 'Unknown'} &bull; Shift: {row.shift}
          </div>
          {row.patient_name && <div className="text-[10px] text-slate-400">Patient: {row.patient_name}</div>}
        </div>
      ),
    },
    {
      header: 'Tank Details',
      key: 'tank',
      render: (row) => (
        <div>
          <div className="font-mono text-xs font-bold text-slate-700">Tank {row.tank}</div>
          <div className="mt-1">
             <Badge variant={row.water_source === 'PrimeWater' ? 'info' : 'success'}>{row.water_source}</Badge>
          </div>
        </div>
      ),
    },
    {
      header: 'Initial (In)',
      key: 'initial',
      render: (row) => (
        <div className="text-xs">
          <div className="text-slate-700">Lvl: <span className="font-semibold">{row.initial_level ?? '-'}</span></div>
          <div className="text-slate-500">Add: {row.initial_additional ?? '-'}</div>
          {row.initial_checked_by && <div className="text-[10px] text-slate-400">By: {row.initial_checked_by}</div>}
        </div>
      ),
    },
    {
      header: 'Subsequent (Out)',
      key: 'subsequent',
      render: (row) => (
        <div className="text-xs">
          <div className="text-slate-700">Lvl: <span className="font-semibold">{row.subsequent_level ?? '-'}</span></div>
          <div className="text-slate-500">Add: {row.subsequent_additional ?? '-'}</div>
          {row.subsequent_checked_by && <div className="text-[10px] text-slate-400">By: {row.subsequent_checked_by}</div>}
        </div>
      ),
    },
    {
      header: 'Consumed',
      key: 'consumption',
      render: (row) => {
         const isIncomplete = row.initial_level === null || row.subsequent_level === null;
         if (isIncomplete) return <Badge variant="warning">Incomplete</Badge>;
         if (row.flag_status) return <Badge variant="error">Flagged</Badge>;
         return (
          <span className="font-bold text-sky-500">
            {row.consumption} <span className="text-[10px] font-normal text-slate-400">units</span>
          </span>
         )
      },
    },
    {
        header: 'Refills',
        key: 'refilled_gallons',
        render: (row) => (
            <span className="text-sm font-semibold text-slate-600">
                {row.refilled_gallons ?? '-'}
            </span>
        )
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(row)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
            Daily Water Tank Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track daily Deepwell and PrimeWater tank levels and calculate consumption.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await handleExportExcel('water', {
                  search,
                  location: locationFilter,
                  water_source: sourceFilter,
                  date: dateFilter
                }, 'Water_Monitoring_Log', 'xlsx');
              } catch (e) {
                alert('Export failed.');
              }
            }}
            icon={Download}
          >
            Export Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={loadData} icon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={Plus}>
            Add Monitoring
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tank, patient..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-40"
          />
          <div className="w-44">
            <Select
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Select
              options={WATER_SOURCES}
              placeholder="All Sources"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        emptyTitle="No water monitoring records"
        emptyDescription="Add tank monitoring records to track daily water usage."
        emptyActionLabel="Add Monitoring"
        onEmptyAction={handleOpenCreate}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditRecord(null);
        }}
        title={editRecord ? 'Update Tank Record' : 'Record Tank Monitoring'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
            {forms.map((formData, index) => (
                <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                    {forms.length > 1 && !editRecord && (
                        <button type="button" onClick={() => removeTankForm(index)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 transition-colors">
                            <Trash2 size={18} />
                        </button>
                    )}
                    <h3 className="font-semibold text-slate-800 mb-4">{editRecord ? 'Edit Tank' : `Tank ${index + 1}`}</h3>
                    
                    {/* General Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <Input type="date" label="Date" required value={formData.date} onChange={(e) => updateForm(index, 'date', e.target.value)} />
                        <Select label="Source" required options={WATER_SOURCES} value={formData.water_source} onChange={(e) => updateForm(index, 'water_source', e.target.value)} />
                        <Select label="Location" required options={locations.map((l) => ({ value: l.id, label: l.name }))} value={formData.location} onChange={(e) => updateForm(index, 'location', e.target.value)} />
                        <Select label="Shift" required options={SHIFTS} value={formData.shift} onChange={(e) => updateForm(index, 'shift', e.target.value)} />
                        <Input label="Tank Number" required value={formData.tank} onChange={(e) => updateForm(index, 'tank', e.target.value)} placeholder="e.g. 1" />
                        <Input label="Patient Name (Optional)" value={formData.patient_name} onChange={(e) => updateForm(index, 'patient_name', e.target.value)} />
                        <Input type="number" label="Refilled Gallons" value={formData.refilled_gallons} onChange={(e) => updateForm(index, 'refilled_gallons', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Initial Reading */}
                        <div className="p-4 border border-slate-200 rounded-lg bg-white">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Initial Reading / Water In</h4>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input type="number" step="0.01" label="Water Level" value={formData.initial_level} onChange={(e) => updateForm(index, 'initial_level', e.target.value)} required />
                                    <Input type="number" step="0.01" label="Additional Water" value={formData.initial_additional} onChange={(e) => updateForm(index, 'initial_additional', e.target.value)} />
                                </div>
                                <Input label="Checked By" value={formData.initial_checked_by} onChange={(e) => updateForm(index, 'initial_checked_by', e.target.value)} />
                                <Input label="Remarks" value={formData.initial_remarks} onChange={(e) => updateForm(index, 'initial_remarks', e.target.value)} />
                            </div>
                        </div>

                        {/* Subsequent Reading */}
                        <div className="p-4 border border-slate-200 rounded-lg bg-white">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Subsequent Reading / Water Out</h4>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input type="number" step="0.01" label="Water Level" value={formData.subsequent_level} onChange={(e) => updateForm(index, 'subsequent_level', e.target.value)} />
                                    <Input type="number" step="0.01" label="Additional Water" value={formData.subsequent_additional} onChange={(e) => updateForm(index, 'subsequent_additional', e.target.value)} />
                                </div>
                                <Input label="Checked By" value={formData.subsequent_checked_by} onChange={(e) => updateForm(index, 'subsequent_checked_by', e.target.value)} />
                                <Input label="Remarks" value={formData.subsequent_remarks} onChange={(e) => updateForm(index, 'subsequent_remarks', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            {!editRecord && (
                <Button type="button" variant="secondary" onClick={addTankForm} icon={Plus}>
                    Add Another Tank
                </Button>
            )}
            <div className="flex gap-2 ml-auto">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" loading={formLoading}>
                    {editRecord ? 'Update' : 'Save Records'}
                </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
