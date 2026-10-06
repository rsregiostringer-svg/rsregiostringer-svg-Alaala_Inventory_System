import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import {
  Building2,
  Users,
  Clock,
  Box,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Plus,
  ClipboardCheck,
  Home,
  Check,
  MapPin,
  HeartHandshake,
  Edit3,
  Trash2,
} from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  formatDate,
  formatDateTimeDisplay,
  CHAPEL_STATUS_MAP,
} from '../utils/formatters';

export default function ChapelMonitoringPage() {
  const [chapels, setChapels] = useState([]);
  const [activeLamays, setActiveLamays] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Turnover Checklist Modal State
  const [turnoverChapel, setTurnoverChapel] = useState(null);
  const [turnoverChecklist, setTurnoverChecklist] = useState({
    casket_removed: false,
    chairs_arranged: false,
    tables_cleaned: false,
    floor_cleaned: false,
    bathroom_checked: false,
    trash_removed: false,
    equipment_checked: false,
    inventory_checked: false,
    chapel_ready: false,
    notes: '',
    deceased_name: ''
  });
  const [turnoverLoading, setTurnoverLoading] = useState(false);
  const [turnoverError, setTurnoverError] = useState('');
  const [turnoverSuccess, setTurnoverSuccess] = useState('');

  // Complete Service Modal State
  const [completeLamayModal, setCompleteLamayModal] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Master Admin Chapel Create/Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    code: '',
    description: '',
    capacity: 50,
    status: 'AVAILABLE'
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');

  // Edit Chapel Modal State
  const [editingChapel, setEditingChapel] = useState(null);
  const [editChapelLoading, setEditChapelLoading] = useState(false);
  const [editChapelError, setEditChapelError] = useState('');

  // Delete Chapel State
  const [deletingChapel, setDeletingChapel] = useState(null);
  const [deleteChapelLoading, setDeleteChapelLoading] = useState(false);

  // Edit Lamay Record State
  const [editingLamay, setEditingLamay] = useState(null);
  const [editLamayLoading, setEditLamayLoading] = useState(false);
  const [editLamayError, setEditLamayError] = useState('');

  // Delete / Cancel Lamay Record State
  const [deletingLamay, setDeletingLamay] = useState(null);
  const [deleteLamayLoading, setDeleteLamayLoading] = useState(false);

  const { user, isMasterAdmin } = useAuth();
  const { pollTick, subscribe } = useRealtime();
  const navigate = useNavigate();

  // Load chapels and active lamay services
  const loadChapelData = useCallback(async (isBg = false) => {
    if (!isBg) setLoading(true);
    else setRefreshing(true);

    try {
      const [chapelRes, activeRes, summaryRes] = await Promise.all([
        api.get('/chapels/'),
        api.get('/lamay/currently_having_lamay/'),
        api.get('/chapels/availability_summary/')
      ]);

      const chapelList = chapelRes.results || chapelRes;
      setChapels(chapelList);
      setActiveLamays(activeRes.active_services || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load chapel monitoring data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadChapelData();
  }, [loadChapelData, pollTick]);

  useEffect(() => {
    const unsub = subscribe('*', (type) => {
      if (
        type.startsWith('chapel.') ||
        type.startsWith('lamay.') ||
        type.startsWith('casket.')
      ) {
        loadChapelData(true);
      }
    });

    return () => unsub();
  }, [subscribe, loadChapelData]);

  // Turnover checklist handlers
  const handleOpenTurnover = (chapel) => {
    setTurnoverChapel(chapel);
    setTurnoverChecklist({
      casket_removed: false,
      chairs_arranged: false,
      tables_cleaned: false,
      floor_cleaned: false,
      bathroom_checked: false,
      trash_removed: false,
      equipment_checked: false,
      inventory_checked: false,
      chapel_ready: false,
      notes: '',
      deceased_name: chapel.current_lamay?.deceased_name || ''
    });
    setTurnoverError('');
    setTurnoverSuccess('');
  };

  const handleToggleChecklistItem = (key) => {
    setTurnoverChecklist((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCheckAllTurnover = () => {
    setTurnoverChecklist((prev) => ({
      ...prev,
      casket_removed: true,
      chairs_arranged: true,
      tables_cleaned: true,
      floor_cleaned: true,
      bathroom_checked: true,
      trash_removed: true,
      equipment_checked: true,
      inventory_checked: true,
      chapel_ready: true,
    }));
  };

  const handleSubmitTurnover = async (e) => {
    e.preventDefault();
    setTurnoverLoading(true);
    setTurnoverError('');
    setTurnoverSuccess('');

    const checklistKeys = [
      'casket_removed',
      'chairs_arranged',
      'tables_cleaned',
      'floor_cleaned',
      'bathroom_checked',
      'trash_removed',
      'equipment_checked',
      'inventory_checked',
      'chapel_ready'
    ];

    const incomplete = checklistKeys.some((k) => !turnoverChecklist[k]);
    if (incomplete) {
      setTurnoverError('All 9 sanitation checklist items must be verified before marking Available.');
      setTurnoverLoading(false);
      return;
    }

    try {
      await api.post(`/chapels/${turnoverChapel.id}/turnover_checklist/`, {
        ...turnoverChecklist,
        mark_available: true
      });

      setTurnoverSuccess('Checklist verified. Chapel is now AVAILABLE.');
      setTimeout(() => {
        setTurnoverChapel(null);
        loadChapelData(true);
      }, 1000);
    } catch (err) {
      setTurnoverError(err.message || 'Failed to submit turnover checklist.');
    } finally {
      setTurnoverLoading(false);
    }
  };

  // Complete Service handler
  const handleConfirmCompleteService = async () => {
    if (!completeLamayModal) return;
    setCompleteLoading(true);

    try {
      await api.post(`/lamay/${completeLamayModal.id}/complete_service/`);
      setCompleteLamayModal(null);
      loadChapelData(true);
    } catch (err) {
      alert(err.message || 'Failed to complete service.');
    } finally {
      setCompleteLoading(false);
    }
  };

  // Create Chapel handler
  const handleCreateChapel = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    setConfigError('');
    try {
      await api.post('/chapels/', configForm);
      setIsConfigModalOpen(false);
      setConfigForm({ name: '', code: '', description: '', capacity: 50, status: 'AVAILABLE' });
      loadChapelData(true);
    } catch (err) {
      setConfigError(err.message || 'Failed to create chapel.');
    } finally {
      setConfigLoading(false);
    }
  };

  // Edit Chapel Handler
  const handleEditChapelSubmit = async (e) => {
    e.preventDefault();
    if (!editingChapel) return;
    setEditChapelLoading(true);
    setEditChapelError('');
    try {
      await api.patch(`/chapels/${editingChapel.id}/`, editingChapel);
      setEditingChapel(null);
      loadChapelData(true);
    } catch (err) {
      setEditChapelError(err.message || 'Failed to update chapel.');
    } finally {
      setEditChapelLoading(false);
    }
  };

  // Delete Chapel Handler
  const handleConfirmDeleteChapel = async () => {
    if (!deletingChapel) return;
    setDeleteChapelLoading(true);
    try {
      const res = await api.delete(`/chapels/${deletingChapel.id}/`);
      setDeletingChapel(null);
      loadChapelData(true);
      if (res?.detail) alert(res.detail);
    } catch (err) {
      alert(err.message || 'Failed to delete chapel.');
    } finally {
      setDeleteChapelLoading(false);
    }
  };

  // Edit Lamay Record Handler
  const handleEditLamaySubmit = async (e) => {
    e.preventDefault();
    if (!editingLamay) return;
    setEditLamayLoading(true);
    setEditLamayError('');
    try {
      await api.patch(`/lamay/${editingLamay.id}/`, {
        chapel: editingLamay.is_residence ? null : editingLamay.chapel,
        is_residence: editingLamay.is_residence,
        residence_address: editingLamay.residence_address,
        lamay_start_date: editingLamay.lamay_start_date,
        lamay_start_time: editingLamay.lamay_start_time,
        expected_burial_date: editingLamay.expected_burial_date || null,
        burial_time: editingLamay.burial_time || null,
        notes: editingLamay.notes
      });
      setEditingLamay(null);
      loadChapelData(true);
    } catch (err) {
      setEditLamayError(err.message || 'Failed to update service record.');
    } finally {
      setEditLamayLoading(false);
    }
  };

  // Delete / Cancel Lamay Record Handler
  const handleConfirmDeleteLamay = async () => {
    if (!deletingLamay) return;
    setDeleteLamayLoading(true);
    try {
      await api.delete(`/lamay/${deletingLamay.id}/`);
      setDeletingLamay(null);
      loadChapelData(true);
    } catch (err) {
      alert(err.message || 'Failed to cancel/delete lamay record.');
    } finally {
      setDeleteLamayLoading(false);
    }
  };

  // Filter chapels
  const filteredChapels = chapels.filter((ch) => {
    const matchesStatus = filterStatus === 'ALL' || ch.status === filterStatus;
    const matchesSearch =
      !search ||
      ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.code.toLowerCase().includes(search.toLowerCase()) ||
      (ch.current_lamay && ch.current_lamay.deceased_name.toLowerCase().includes(search.toLowerCase())) ||
      (ch.current_lamay && ch.current_lamay.buyer_name.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Chapel & Lamay Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Realtime wake occupancy, deceased tracking, burial schedules, and room readiness.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadChapelData(true)}
            loading={refreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>

          {isMasterAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConfigModalOpen(true)}
              icon={Plus}
            >
              Add Chapel
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards - Clean White */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Chapels</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_chapels ?? chapels.length}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Facility Units</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Available</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{summary?.available ?? 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Ready for service</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Occupied</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary?.occupied ?? 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Active wake services</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Reserved</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{summary?.reserved ?? 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Upcoming dates</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Cleaning</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{summary?.cleaning ?? 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Needs turnover</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Maintenance</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{summary?.maintenance ?? 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Under repair</span>
        </div>
      </div>

      {/* "CURRENTLY HAVING LAMAY" Section */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <h2 className="text-base font-bold text-slate-900">
              Currently Having Lamay ({activeLamays.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {activeLamays.length > 0 ? 'Active wake vigils in progress' : 'No active wake services right now'}
          </span>
        </div>

        {activeLamays.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <HeartHandshake className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800">No wake services are currently active.</p>
            <p className="text-xs text-slate-500 mt-1">All chapels are either available, cleaning, or reserved.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {activeLamays.map((lamay) => {
              const isResidence = lamay.is_residence;
              return (
                <div
                  key={lamay.id}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase inline-flex items-center gap-1">
                          {isResidence ? (
                            <>
                              <Home className="w-3 h-3" />
                              Residence Viewing
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3" />
                              {lamay.chapel_details?.name || 'Chapel Unit'}
                            </>
                          )}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-2 truncate">
                          {lamay.deceased_details?.full_name || lamay.deceased_name}
                        </h3>
                      </div>

                      <Badge variant="blue" size="sm">
                        {isResidence ? 'Home Wake' : 'In Service'}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                      {isResidence && (
                        <div className="flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-800">
                            {lamay.residence_address || 'Family Home'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Buyer / Family:</span>
                        <span className="font-medium text-slate-900 truncate">
                          {lamay.buyer_details?.full_name || lamay.buyer_name}
                          {lamay.buyer_details?.contact_number ? ` · ${lamay.buyer_details.contact_number}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Lamay Dates:</span>
                        <span className="font-mono text-slate-800">
                          {formatDate(lamay.lamay_start_date)} – {formatDate(lamay.expected_end_date || lamay.expected_burial_date)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Expected Burial:</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatDateTimeDisplay(lamay.expected_burial_date, lamay.burial_time)}
                        </span>
                      </div>

                      {lamay.casket_details && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Casket:</span>
                          <span className="text-slate-700 truncate font-mono text-xs">
                            {lamay.casket_details.casket_id} · {lamay.casket_details.model}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono truncate">
                      Case: {lamay.funeral_case_id || 'N/A'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingLamay({
                          id: lamay.id,
                          deceased_name: lamay.deceased_details?.full_name || lamay.deceased_name,
                          chapel: lamay.chapel,
                          is_residence: lamay.is_residence,
                          residence_address: lamay.residence_address || '',
                          lamay_start_date: lamay.lamay_start_date,
                          lamay_start_time: lamay.lamay_start_time || '18:00',
                          expected_burial_date: lamay.expected_burial_date || '',
                          burial_time: lamay.burial_time || '09:00',
                          notes: lamay.notes || ''
                        })}
                        icon={Edit3}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setCompleteLamayModal(lamay)}
                      >
                        Complete
                      </Button>
                      {isMasterAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeletingLamay(lamay)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Cancel/Delete Lamay"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Search Bar for Chapels */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Chapels' },
            { id: 'AVAILABLE', label: 'Available' },
            { id: 'OCCUPIED', label: 'Occupied' },
            { id: 'CLEANING', label: 'Cleaning' },
            { id: 'RESERVED', label: 'Reserved' },
            { id: 'MAINTENANCE', label: 'Maintenance' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search chapel or deceased..."
          />
        </div>
      </div>

      {/* CHAPEL MONITORING GRID */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>Chapels Live Status</span>
          <span className="text-xs text-slate-500 font-normal">({filteredChapels.length} units displayed)</span>
        </h2>

        {filteredChapels.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-slate-500 shadow-xs">
            No chapels found matching criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredChapels.map((chapel) => {
              const statusCfg = CHAPEL_STATUS_MAP[chapel.status] || {
                label: chapel.status,
                variant: 'neutral'
              };

              const currentLamay = chapel.current_lamay;

              return (
                <div
                  key={chapel.id}
                  className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:border-blue-500 transition-colors"
                >
                  {/* Card Top */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800">
                          {chapel.code || chapel.name.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{chapel.name}</h3>
                          <span className="text-[11px] text-slate-500">Capacity: {chapel.capacity} persons</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge variant={statusCfg.variant} size="sm">
                          {statusCfg.label}
                        </Badge>
                        {isMasterAdmin && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setEditingChapel({ ...chapel })}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Chapel"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingChapel(chapel)}
                              className="p-1 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Chapel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Content according to Status */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {chapel.status === 'OCCUPIED' && currentLamay ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Deceased:</span>
                            <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{currentLamay.deceased_name}</p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Buyer:</span>
                            <p className="text-slate-800 font-medium truncate">{currentLamay.buyer_name} ({currentLamay.buyer_contact})</p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 font-mono text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Lamay:</span>
                              <span className="text-slate-800">
                                {formatDate(currentLamay.lamay_start_date)} – {formatDate(currentLamay.expected_burial_date)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Burial:</span>
                              <span className="text-slate-900 font-bold">
                                {formatDateTimeDisplay(currentLamay.expected_burial_date, currentLamay.burial_time)}
                              </span>
                            </div>
                          </div>

                          {currentLamay.casket_model && (
                            <p className="text-xs text-slate-600 font-mono truncate">
                              Casket: {currentLamay.casket_id} · {currentLamay.casket_model}
                            </p>
                          )}
                        </div>
                      ) : chapel.status === 'CLEANING' ? (
                        <div className="space-y-2 py-3 text-center text-xs">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-blue-700">Turnover In Progress</p>
                          <p className="text-slate-500">
                            Checklist required before chapel can be marked available.
                          </p>
                        </div>
                      ) : chapel.status === 'AVAILABLE' ? (
                        <div className="py-4 text-center text-xs text-slate-500">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-blue-600 mb-1.5" />
                          <p className="font-bold text-slate-800">Available</p>
                          <p className="text-slate-500 mt-0.5">Ready for wake assignment</p>
                        </div>
                      ) : chapel.status === 'RESERVED' ? (
                        <div className="space-y-1.5 py-3 text-xs">
                          <p className="text-amber-800 font-bold">Reserved for Upcoming Service</p>
                          <p className="text-slate-500">Schedule reserved in calendar.</p>
                        </div>
                      ) : (
                        <div className="py-3 text-xs text-slate-500">
                          <p className="font-bold text-amber-800">Under Maintenance</p>
                          <p className="text-slate-500">Currently out of operational service.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {chapel.status === 'OCCUPIED' && currentLamay && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setCompleteLamayModal(currentLamay)}
                      >
                        Complete / Leaves for Burial
                      </Button>
                    )}

                    {chapel.status === 'CLEANING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs"
                        icon={ClipboardCheck}
                        onClick={() => handleOpenTurnover(chapel)}
                      >
                        Turnover Checklist
                      </Button>
                    )}

                    {chapel.status === 'AVAILABLE' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => navigate('/caskets')}
                      >
                        Assign Casket & Wake &rarr;
                      </Button>
                    )}

                    {chapel.status !== 'OCCUPIED' && chapel.status !== 'CLEANING' && chapel.status !== 'AVAILABLE' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleOpenTurnover(chapel)}
                      >
                        Turnover / Inspect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CHAPEL TURNOVER CHECKLIST MODAL */}
      <Modal
        isOpen={Boolean(turnoverChapel)}
        onClose={() => setTurnoverChapel(null)}
        title="Chapel Turnover & Inspection Checklist"
        subtitle={`Sanitation verification for ${turnoverChapel?.name} before marking AVAILABLE`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitTurnover} className="space-y-4">
          {turnoverError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{turnoverError}</span>
            </div>
          )}

          {turnoverSuccess && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{turnoverSuccess}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500">Chapel Unit:</span>
              <p className="font-bold text-slate-900">{turnoverChapel?.name}</p>
            </div>
            <div>
              <span className="text-slate-500">Inspector:</span>
              <p className="font-mono text-slate-800">{user?.username}</p>
            </div>
            <div>
              <span className="text-slate-500">Time:</span>
              <p className="font-mono text-slate-700">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-800">
              Required 9 Inspection Checks
            </span>
            <button
              type="button"
              onClick={handleCheckAllTurnover}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
            >
              Verify All Items
            </button>
          </div>

          {/* 9 Checklist Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {[
              { key: 'casket_removed', label: 'Casket removed & area cleared' },
              { key: 'chairs_arranged', label: 'Chairs sanitized & arranged' },
              { key: 'tables_cleaned', label: 'Tables cleaned & wiped' },
              { key: 'floor_cleaned', label: 'Floor swept, mopped & disinfected' },
              { key: 'bathroom_checked', label: 'Bathroom checked & supplies restocked' },
              { key: 'trash_removed', label: 'Trash emptied & liners replaced' },
              { key: 'equipment_checked', label: 'Lights, AC, sound equipment checked' },
              { key: 'inventory_checked', label: 'Chapel accessories & inventory checked' },
              { key: 'chapel_ready', label: 'Chapel ready & certified for next service' },
            ].map((item) => {
              const checked = turnoverChecklist[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggleChecklistItem(item.key)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                    checked
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                      checked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>

          <Input
            label="Inspector Notes (Optional)"
            placeholder="e.g. Completed disinfection spray, all flowers cleared."
            value={turnoverChecklist.notes}
            onChange={(e) => setTurnoverChecklist({ ...turnoverChecklist, notes: e.target.value })}
          />

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTurnoverChapel(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={turnoverLoading}
              icon={CheckCircle2}
            >
              Mark Chapel Available
            </Button>
          </div>
        </form>
      </Modal>

      {/* COMPLETE SERVICE / BURIAL CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(completeLamayModal)}
        onClose={() => setCompleteLamayModal(null)}
        title="Complete Wake & Service for Burial"
        subtitle="Deceased leaves for burial service"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <p className="font-bold text-sm text-amber-900">
              Confirm Service Completion?
            </p>
            <p>
              Deceased: <strong>{completeLamayModal?.deceased_details?.full_name || completeLamayModal?.deceased_name}</strong>
            </p>
            <p>
              Venue: <strong>{completeLamayModal?.is_residence ? `Residence (${completeLamayModal?.residence_address || 'Family Home'})` : (completeLamayModal?.chapel_details?.name || 'Chapel')}</strong>
            </p>
            <p className="text-slate-700 mt-2">
              {completeLamayModal?.is_residence ? (
                <>
                  Marking this home viewing completed will set the lamay record status to <strong>COMPLETED</strong>.
                </>
              ) : (
                <>
                  Marking this service completed will set the lamay record status to <strong>COMPLETED</strong> and transition the assigned chapel to <strong>CLEANING</strong>.
                  Staff must complete the 9-point turnover checklist before the chapel becomes <strong>AVAILABLE</strong>.
                </>
              )}
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCompleteLamayModal(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={completeLoading}
              onClick={handleConfirmCompleteService}
            >
              Yes, Mark Completed
            </Button>
          </div>
        </div>
      </Modal>

      {/* MASTER ADMIN: CONFIGURE CHAPEL MODAL */}
      {isMasterAdmin && (
        <Modal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          title="Add Chapel Unit"
          subtitle="Add new chapel facility for Alaala Funeral Homes"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateChapel} className="space-y-4">
            {configError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {configError}
              </div>
            )}

            <Input
              label="Chapel Name"
              required
              placeholder="e.g. Chapel 5 - St. Gabriel"
              value={configForm.name}
              onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
            />

            <Input
              label="Chapel Code / Identifier"
              required
              placeholder="e.g. CHAPEL-5"
              value={configForm.code}
              onChange={(e) => setConfigForm({ ...configForm, code: e.target.value.toUpperCase() })}
            />

            <Input
              type="number"
              label="Seating Capacity"
              required
              min={1}
              value={configForm.capacity}
              onChange={(e) => setConfigForm({ ...configForm, capacity: parseInt(e.target.value, 10) || 50 })}
            />

            <Input
              label="Description / Special Features"
              placeholder="e.g. Suite with private family rest area"
              value={configForm.description}
              onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
            />

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsConfigModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={configLoading}
                icon={Plus}
              >
                Save Chapel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT CHAPEL MODAL */}
      <Modal
        isOpen={Boolean(editingChapel)}
        onClose={() => setEditingChapel(null)}
        title="Edit Chapel Details"
        subtitle={editingChapel ? `Modify configuration for ${editingChapel.name}` : ''}
        maxWidth="max-w-md"
      >
        {editingChapel && (
          <form onSubmit={handleEditChapelSubmit} className="space-y-4">
            {editChapelError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {editChapelError}
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
                label="Capacity"
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

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingChapel(null)}
                disabled={editChapelLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={editChapelLoading}
                icon={CheckCircle2}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* EDIT LAMAY SERVICE MODAL */}
      <Modal
        isOpen={Boolean(editingLamay)}
        onClose={() => setEditingLamay(null)}
        title="Edit Wake Schedule"
        subtitle={editingLamay ? `Updating service for ${editingLamay.deceased_name}` : ''}
        maxWidth="max-w-lg"
      >
        {editingLamay && (
          <form onSubmit={handleEditLamaySubmit} className="space-y-4">
            {editLamayError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {editLamayError}
              </div>
            )}

            {/* Venue Selector */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">Viewing Venue</label>
                <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setEditingLamay({ ...editingLamay, is_residence: false, chapel: chapels[0]?.id || '' })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                      !editingLamay.is_residence
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Chapel
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLamay({ ...editingLamay, is_residence: true, chapel: null })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                      editingLamay.is_residence
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    Residence
                  </button>
                </div>
              </div>

              {!editingLamay.is_residence ? (
                <Select
                  label="Assigned Chapel"
                  options={chapels.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.status_display || c.status})`
                  }))}
                  value={editingLamay.chapel || ''}
                  onChange={(e) => setEditingLamay({ ...editingLamay, chapel: e.target.value })}
                />
              ) : (
                <Input
                  label="Residence / Viewing Address"
                  required
                  placeholder="e.g. 123 Sampaguita St., Brgy. San Jose"
                  value={editingLamay.residence_address || ''}
                  onChange={(e) => setEditingLamay({ ...editingLamay, residence_address: e.target.value })}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="Lamay Start Date"
                required
                value={editingLamay.lamay_start_date || ''}
                onChange={(e) => setEditingLamay({ ...editingLamay, lamay_start_date: e.target.value })}
              />

              <Input
                type="time"
                label="Start Time"
                value={editingLamay.lamay_start_time || '18:00'}
                onChange={(e) => setEditingLamay({ ...editingLamay, lamay_start_time: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="Expected Burial Date"
                value={editingLamay.expected_burial_date || ''}
                onChange={(e) => setEditingLamay({ ...editingLamay, expected_burial_date: e.target.value })}
              />

              <Input
                type="time"
                label="Burial Time"
                value={editingLamay.burial_time || '09:00'}
                onChange={(e) => setEditingLamay({ ...editingLamay, burial_time: e.target.value })}
              />
            </div>

            <Input
              label="Service Notes"
              placeholder="Special arrangements, family requests..."
              value={editingLamay.notes || ''}
              onChange={(e) => setEditingLamay({ ...editingLamay, notes: e.target.value })}
            />

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingLamay(null)}
                disabled={editLamayLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={editLamayLoading}
                icon={CheckCircle2}
              >
                Save Schedule
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE CHAPEL CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingChapel)}
        onClose={() => setDeletingChapel(null)}
        onConfirm={handleConfirmDeleteChapel}
        title="Delete Chapel Unit"
        message={`Are you sure you want to delete ${deletingChapel?.name}?`}
        confirmText="Delete Chapel"
        variant="danger"
        loading={deleteChapelLoading}
      />

      {/* CANCEL / DELETE LAMAY RECORD CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingLamay)}
        onClose={() => setDeletingLamay(null)}
        onConfirm={handleConfirmDeleteLamay}
        title="Cancel Wake Service"
        message={`Are you sure you want to cancel or remove this service record for ${deletingLamay?.deceased_details?.full_name || deletingLamay?.deceased_name}?`}
        confirmText="Cancel Service Record"
        variant="danger"
        loading={deleteLamayLoading}
      />
    </div>
  );
}
