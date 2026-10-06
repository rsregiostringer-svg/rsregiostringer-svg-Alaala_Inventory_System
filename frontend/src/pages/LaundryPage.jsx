import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Plus,
  RefreshCw,
  Shirt,
  Filter,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  User,
  Building2,
  CalendarRange,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LaundryPage() {
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pollTick, subscribe } = useRealtime();

  // Search & Status filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');

  // Date Range Filter State
  // Mode: 'ALL' | 'MONTH' | 'WEEK' | 'DAY' | 'CUSTOM'
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth(); // 0-11 (October is 9 in standard 0-indexed or 10)

  const [rangeMode, setRangeMode] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeekType, setSelectedWeekType] = useState('THIS_WEEK'); // 'THIS_WEEK' | 'LAST_WEEK' | 'LAST_7_DAYS'
  const [selectedDayType, setSelectedDayType] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'SPECIFIC'
  const [specificDay, setSpecificDay] = useState(currentDate.toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState(currentDate.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(currentDate.toISOString().split('T')[0]);

  // Modals
  const [advanceRecord, setAdvanceRecord] = useState(null);
  const [targetStage, setTargetStage] = useState(null);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    location: '',
    item: '',
    quantity: 1,
    laundry_in_date: currentDate.toISOString().split('T')[0],
    laundry_in_time: currentDate.toTimeString().slice(0, 5),
    laundry_in_shift: '8am to 5pm',
    laundry_in_charge: '',
    notes: '',
  });
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteBatch = async () => {
    if (!deleteBatchTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/laundry/${deleteBatchTarget.id}/`);
      setDeleteBatchTarget(null);
      loadLaundry();
    } catch (err) {
      alert(err.message || 'Failed to delete laundry record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Compute effective start and end date based on active range mode
  const { effectiveStartDate, effectiveEndDate, rangeLabel } = useMemo(() => {
    if (rangeMode === 'ALL') {
      return { effectiveStartDate: '', effectiveEndDate: '', rangeLabel: 'All Records' };
    }

    if (rangeMode === 'MONTH') {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        effectiveStartDate: sStr,
        effectiveEndDate: eStr,
        rangeLabel: `${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
      };
    }

    if (rangeMode === 'WEEK') {
      const now = new Date();
      if (selectedWeekType === 'LAST_7_DAYS') {
        const eStr = now.toISOString().split('T')[0];
        const prev = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const sStr = prev.toISOString().split('T')[0];
        return {
          effectiveStartDate: sStr,
          effectiveEndDate: eStr,
          rangeLabel: 'Past 7 Days',
        };
      }

      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      if (selectedWeekType === 'LAST_WEEK') {
        monday.setDate(monday.getDate() - 7);
      }
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const sStr = monday.toISOString().split('T')[0];
      const eStr = sunday.toISOString().split('T')[0];
      const label = selectedWeekType === 'THIS_WEEK' ? 'This Week' : 'Last Week';
      return {
        effectiveStartDate: sStr,
        effectiveEndDate: eStr,
        rangeLabel: `${label} (${sStr} to ${eStr})`,
      };
    }

    if (rangeMode === 'DAY') {
      let targetDateStr = specificDay;
      let label = `Day (${specificDay})`;
      if (selectedDayType === 'TODAY') {
        targetDateStr = new Date().toISOString().split('T')[0];
        label = `Today (${targetDateStr})`;
      } else if (selectedDayType === 'YESTERDAY') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        targetDateStr = y.toISOString().split('T')[0];
        label = `Yesterday (${targetDateStr})`;
      }
      return {
        effectiveStartDate: targetDateStr,
        effectiveEndDate: targetDateStr,
        rangeLabel: label,
      };
    }

    if (rangeMode === 'CUSTOM') {
      return {
        effectiveStartDate: customStartDate,
        effectiveEndDate: customEndDate,
        rangeLabel: `Custom (${customStartDate} to ${customEndDate})`,
      };
    }

    return { effectiveStartDate: '', effectiveEndDate: '', rangeLabel: 'All Records' };
  }, [
    rangeMode,
    selectedMonth,
    selectedYear,
    selectedWeekType,
    selectedDayType,
    specificDay,
    customStartDate,
    customEndDate,
  ]);

  // Load staff list for intake in-charge quick selection
  useEffect(() => {
    api.get('/users/')
      .then((data) => setStaffList(data.results || data || []))
      .catch((err) => console.warn('Could not load users for staff datalist:', err));
  }, []);

  const loadLaundry = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        search,
        location: selectedLocation,
        status: selectedStatus,
      };
      if (effectiveStartDate) query.start_date = effectiveStartDate;
      if (effectiveEndDate) query.end_date = effectiveEndDate;

      const [recRes, locRes] = await Promise.all([
        api.get('/laundry/', query),
        api.get('/locations/'),
      ]);
      setRecords(recRes.results || recRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading laundry records:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedLocation, selectedStatus, effectiveStartDate, effectiveEndDate]);

  useEffect(() => {
    loadLaundry();
  }, [loadLaundry, pollTick]);

  useEffect(() => {
    const unsubLaundry = subscribe('laundry.*', () => loadLaundry());
    const unsubLocations = subscribe('locations.*', () => loadLaundry());
    return () => {
      unsubLaundry();
      unsubLocations();
    };
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
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        module: 'laundry',
        location: selectedLocation || '',
      });
      if (effectiveStartDate) params.set('start_date', effectiveStartDate);
      if (effectiveEndDate) params.set('end_date', effectiveEndDate);

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

      // Descriptive filename matching active filter
      let fileSuffix = 'all_records';
      if (rangeMode === 'MONTH') {
        fileSuffix = `${MONTH_NAMES[selectedMonth].toLowerCase()}_${selectedYear}`;
      } else if (rangeMode === 'DAY') {
        fileSuffix = `day_${effectiveStartDate}`;
      } else if (rangeMode === 'WEEK') {
        fileSuffix = `week_${effectiveStartDate}_to_${effectiveEndDate}`;
      } else if (rangeMode === 'CUSTOM') {
        fileSuffix = `${effectiveStartDate}_to_${effectiveEndDate}`;
      }

      a.download = `alaala_laundry_${fileSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export laundry CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenNewBatch = () => {
    const defaultStaff = user
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
      : '';
    // Prefer NO CODE as default if found
    const noCodeLoc = locations.find((l) => l.name === 'NO CODE' || l.code === 'NO_CODE');
    setNewBatchData({
      location: noCodeLoc ? noCodeLoc.id : locations[0]?.id || '',
      item: '',
      quantity: 1,
      laundry_in_date: new Date().toISOString().split('T')[0],
      laundry_in_time: new Date().toTimeString().slice(0, 5),
      laundry_in_shift: '8am to 5pm',
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
        encoded_by: user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
          : 'Staff',
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
          <h1 className="text-2xl font-serif font-bold text-black-100 tracking-wide">
            Laundry Monitoring Sheet
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exact 10-column tracking: IN &rarr; Laba &rarr; Banlaw &rarr; Sampay &rarr; Pinaw &rarr; Tiklop &rarr; Returned.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            loading={isExporting}
            icon={Download}
            title={`Export CSV for ${rangeLabel}`}
          >
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

      {/* Date Range Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F0F2F5]/80 rounded-lg border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setRangeMode('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${rangeMode === 'ALL'
                ? 'bg-[#0866FF] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('MONTH')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${rangeMode === 'MONTH'
                ? 'bg-[#0866FF] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Month Range
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('WEEK')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${rangeMode === 'WEEK'
                ? 'bg-[#0866FF] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Weeks
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('DAY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${rangeMode === 'DAY'
                ? 'bg-[#0866FF] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Days
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${rangeMode === 'CUSTOM'
                ? 'bg-[#0866FF] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Custom Range
            </button>
          </div>

          {/* Range Controls based on Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {rangeMode === 'MONTH' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-[#0866FF]"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-[#0866FF]"
                >
                  <option value={currentYear}>{currentYear}</option>
                  <option value={currentYear - 1}>{currentYear - 1}</option>
                  <option value={currentYear - 2}>{currentYear - 2}</option>
                </select>
              </div>
            )}

            {rangeMode === 'WEEK' && (
              <select
                value={selectedWeekType}
                onChange={(e) => setSelectedWeekType(e.target.value)}
                className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-[#0866FF]"
              >
                <option value="THIS_WEEK">This Current Week</option>
                <option value="LAST_WEEK">Last Week</option>
                <option value="LAST_7_DAYS">Past 7 Days</option>
              </select>
            )}

            {rangeMode === 'DAY' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedDayType}
                  onChange={(e) => setSelectedDayType(e.target.value)}
                  className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-[#0866FF]"
                >
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="SPECIFIC">Specific Date</option>
                </select>

                {selectedDayType === 'SPECIFIC' && (
                  <input
                    type="date"
                    value={specificDay}
                    onChange={(e) => setSpecificDay(e.target.value)}
                    className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-[#0866FF]"
                  />
                )}
              </div>
            )}

            {rangeMode === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0866FF]"
                />
                <span className="text-slate-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#F0F2F5] border border-slate-200 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0866FF]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Active Range Banner */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0866FF]/15 border border-[#0866FF]/30 text-amber-300 flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-blue-500" />
              Active Range: {rangeLabel}
            </span>
            <span className="text-slate-500 font-medium">
              ({records.length} batch{records.length === 1 ? '' : 'es'} matched)
            </span>
          </div>

          {rangeMode !== 'ALL' && (
            <button
              type="button"
              onClick={() => setRangeMode('ALL')}
              className="text-[11px] text-slate-500 hover:text-white underline cursor-pointer"
            >
              Reset to All Dates
            </button>
          )}
        </div>
      </div>

      {/* General Filters: Search, Chapel/Tag, Status */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            handleFilterChange('search', val);
          }}
          placeholder="Search items, personnel (laba, banlaw, sampay...), notes..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-48">
            <Select
              options={locations.map((l) => ({
                value: l.id,
                label: l.name === 'NO CODE' ? 'NO CODE (General Linen)' : l.name,
              }))}
              placeholder="All Chapels / Tags"
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

      {/* Laundry Monitoring Sheet View (Progressive skeletal loading) */}
      <LaundryExcelTable
        records={records}
        loading={loading}
        onAdvanceStage={handleOpenAdvance}
        onViewDetail={(record) => navigate(`/laundry/${record.id}`)}
        onDeleteRecord={(record) => setDeleteBatchTarget(record)}
        isMasterAdmin={user?.role === 'MASTER_ADMIN' || user?.is_master_admin}
      />

      {/* Advance Stage & Personnel Modal */}
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
            label="Originating Chapel / Tag"
            required
            options={locations.map((l) => ({
              value: l.id,
              label: l.name === 'NO CODE' ? 'NO CODE (Uncoded / General Linen)' : l.name,
            }))}
            value={newBatchData.location}
            onChange={(e) => setNewBatchData({ ...newBatchData, location: e.target.value })}
            helperText="Select NO CODE if item has no chapel code or is general linen/rags."
          />

          <Input
            label="Item Description"
            placeholder="e.g. White Satin Towels, Altar Curtains, Basahan"
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
              onChange={(e) =>
                setNewBatchData({
                  ...newBatchData,
                  quantity: parseInt(e.target.value, 10) || 1,
                })
              }
            />

            <Select
              label="Intake Shift"
              required
              options={[
                { value: '8am to 5pm', label: '8am to 5pm' },
                { value: '4pm to 1am', label: '4pm to 1am' },
                { value: '12midnight to 9am', label: '12midnight to 9am' },
              ]}
              value={newBatchData.laundry_in_shift}
              onChange={(e) =>
                setNewBatchData({ ...newBatchData, laundry_in_shift: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Intake Date"
              required
              value={newBatchData.laundry_in_date}
              onChange={(e) =>
                setNewBatchData({ ...newBatchData, laundry_in_date: e.target.value })
              }
            />

            <Input
              type="time"
              label="Intake Time (Hour)"
              required
              value={newBatchData.laundry_in_time}
              onChange={(e) =>
                setNewBatchData({ ...newBatchData, laundry_in_time: e.target.value })
              }
            />
          </div>

          <div>
            <Input
              label="In Charge (Received By)"
              placeholder="e.g. Juan Dela Cruz"
              required
              value={newBatchData.laundry_in_charge}
              onChange={(e) =>
                setNewBatchData({ ...newBatchData, laundry_in_charge: e.target.value })
              }
              list="intake-staff-list"
            />
            <datalist id="intake-staff-list">
              {staffList.map((s) => (
                <option
                  key={s.id}
                  value={`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username}
                />
              ))}
            </datalist>

            {staffList.length > 0 && (
              <div className="pt-1.5 flex flex-wrap gap-1.5">
                {staffList.slice(0, 4).map((s) => {
                  const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setNewBatchData({ ...newBatchData, laundry_in_charge: name })
                      }
                      className="px-2 py-0.5 text-[11px] rounded bg-white text-slate-600 hover:bg-slate-200 cursor-pointer border border-slate-300"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Input
            label="Special Washing Instructions / Notes"
            placeholder="e.g. Gentle cycle, heavy stain pre-treatment"
            value={newBatchData.notes}
            onChange={(e) => setNewBatchData({ ...newBatchData, notes: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={() => setIsNewBatchOpen(false)}
              disabled={batchLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={batchLoading}>
              Record Laundry Intake
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Master Admin */}
      <Modal
        isOpen={!!deleteBatchTarget}
        onClose={() => setDeleteBatchTarget(null)}
        title="Delete Laundry Record"
        subtitle="Permanent action reserved for Master Admin"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Are you sure you want to permanently delete this batch?</p>
              <p className="mt-1">
                Batch #{deleteBatchTarget?.id} &bull; <strong>{deleteBatchTarget?.item}</strong> ({deleteBatchTarget?.quantity} pcs).
                This action cannot be undone and will be logged in the system audit trail.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteBatchTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteBatch} loading={deleteLoading} icon={Trash2}>
              Permanently Delete Batch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
