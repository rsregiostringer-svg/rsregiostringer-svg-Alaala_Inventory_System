import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import LaundryExcelTable from '../components/laundry/LaundryExcelTable';
import AdvanceStageModal from '../components/laundry/AdvanceStageModal';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import LoadingState from '../components/common/LoadingState';
import { Plus, RefreshCw, Shirt, Filter, Download } from 'lucide-react';

export default function LaundryPage() {
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pollTick, subscribe } = useRealtime();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');

  // Modals
  const [advanceRecord, setAdvanceRecord] = useState(null);
  const [targetStage, setTargetStage] = useState(null);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    location: '',
    item: '',
    quantity: 1,
    laundry_in_date: new Date().toISOString().split('T')[0],
    laundry_in_shift: 'Morning',
    laundry_in_charge: '',
    notes: '',
  });
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');

  const loadLaundry = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, locRes] = await Promise.all([
        api.get('/laundry/', {
          search,
          location: selectedLocation,
          status: selectedStatus,
        }),
        api.get('/locations/'),
      ]);
      setRecords(recRes.results || recRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading laundry records:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedLocation, selectedStatus]);

  useEffect(() => {
    loadLaundry();
  }, [loadLaundry, pollTick]);

  useEffect(() => {
    const unsub = subscribe('laundry.*', () => loadLaundry());
    return () => unsub();
  }, [subscribe, loadLaundry]);

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams);

    if (key === 'location') setSelectedLocation(value);
    if (key === 'status') setSelectedStatus(value);
  };

  const handleOpenAdvance = (record, stageKey = null) => {
    setAdvanceRecord(record);
    setTargetStage(stageKey);
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        module: 'laundry',
        location: selectedLocation || '',
      });
      const exportUrl = `${api.baseUrl}/reports/export-csv/?${params.toString()}`;
      const token = localStorage.getItem('alaala_access_token');

      const res = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alaala_laundry_monitoring_sheet_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export laundry CSV:', err);
    }
  };

  const handleOpenNewBatch = () => {
    const defaultStaff = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '';
    setNewBatchData({
      location: locations[0]?.id || '',
      item: '',
      quantity: 1,
      laundry_in_date: new Date().toISOString().split('T')[0],
      laundry_in_shift: 'Morning',
      laundry_in_charge: defaultStaff,
      notes: '',
    });
    setBatchError('');
    setIsNewBatchOpen(true);
  };

  const handleNewBatchSubmit = async (e) => {
    e.preventDefault();
    if (!newBatchData.item.trim()) {
      setBatchError('Item description is required.');
      return;
    }
    if (!newBatchData.laundry_in_charge.trim()) {
      setBatchError('Person in charge of receiving is required.');
      return;
    }

    setBatchLoading(true);
    setBatchError('');

    try {
      await api.post('/laundry/', {
        ...newBatchData,
        encoded_by: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Staff',
      });
      setIsNewBatchOpen(false);
      loadLaundry();
    } catch (err) {
      setBatchError(err.message || 'Failed to intake laundry record.');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            Laundry Monitoring Sheet
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Exact Alaala Funeral Homes monitoring workflow: IN &rarr; LABA &rarr; BANLAW &rarr; SAMPAY &rarr; PINAW &rarr; TIKLOP &rarr; RETURNED.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} icon={Download}>
            Export Excel (CSV)
          </Button>
          <Button variant="secondary" size="sm" onClick={loadLaundry} icon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenNewBatch} icon={Plus}>
            New Laundry Intake
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            handleFilterChange('search', val);
          }}
          placeholder="Search items, personnel, or notes..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-44">
            <Select
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={selectedLocation}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>

          <div className="w-48">
            <Select
              options={[
                { value: 'IN_PROCESS', label: 'All In-Process (Active)' },
                { value: 'FOR_LABA', label: 'For Laba' },
                { value: 'FOR_BANLAW', label: 'For Banlaw' },
                { value: 'FOR_SAMPAY', label: 'For Sampay' },
                { value: 'FOR_PINAW', label: 'For Pinaw' },
                { value: 'FOR_TIKLOP', label: 'For Tiklop' },
                { value: 'READY_FOR_RETURN', label: 'Ready for Return' },
                { value: 'RETURNED', label: 'Returned' },
              ]}
              placeholder="All Statuses"
              value={selectedStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Laundry Monitoring Sheet View */}
      {loading && records.length === 0 ? (
        <LoadingState message="Loading laundry tracking sheet..." />
      ) : (
        <LaundryExcelTable
          records={records}
          onAdvanceStage={handleOpenAdvance}
          onViewDetail={(record) => navigate(`/laundry/${record.id}`)}
        />
      )}

      {/* Advance Stage Modal */}
      <AdvanceStageModal
        isOpen={!!advanceRecord}
        onClose={() => {
          setAdvanceRecord(null);
          setTargetStage(null);
        }}
        record={advanceRecord}
        targetStage={targetStage}
        currentUser={user}
        onSuccess={() => loadLaundry()}
      />

      {/* New Laundry Intake Modal */}
      <Modal
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
        title="New Laundry Batch Intake"
        subtitle="Record linen, drape, or garment intake into the laundry facility"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleNewBatchSubmit} className="space-y-4">
          {batchError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {batchError}
            </div>
          )}

          <Select
            label="Originating Location / Chapel"
            required
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            value={newBatchData.location}
            onChange={(e) => setNewBatchData({ ...newBatchData, location: e.target.value })}
          />

          <Input
            label="Item Description"
            placeholder="e.g. White Satin Towels, Altar Curtains, Barong Covers"
            required
            value={newBatchData.item}
            onChange={(e) => setNewBatchData({ ...newBatchData, item: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              min="1"
              required
              value={newBatchData.quantity}
              onChange={(e) => setNewBatchData({ ...newBatchData, quantity: parseInt(e.target.value, 10) || 1 })}
            />

            <Select
              label="Intake Shift"
              required
              options={[
                { value: 'Morning', label: 'Morning' },
                { value: 'Afternoon', label: 'Afternoon' },
                { value: 'Night', label: 'Night' },
              ]}
              value={newBatchData.laundry_in_shift}
              onChange={(e) => setNewBatchData({ ...newBatchData, laundry_in_shift: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Intake Date"
              required
              value={newBatchData.laundry_in_date}
              onChange={(e) => setNewBatchData({ ...newBatchData, laundry_in_date: e.target.value })}
            />

            <Input
              label="In Charge (Received By)"
              placeholder="e.g. Juan Dela Cruz"
              required
              value={newBatchData.laundry_in_charge}
              onChange={(e) => setNewBatchData({ ...newBatchData, laundry_in_charge: e.target.value })}
            />
          </div>

          <Input
            label="Special Washing Instructions / Notes"
            placeholder="e.g. Gentle cycle, heavy stain pre-treatment"
            value={newBatchData.notes}
            onChange={(e) => setNewBatchData({ ...newBatchData, notes: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsNewBatchOpen(false)} disabled={batchLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={batchLoading}>
              Record Laundry Intake
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
