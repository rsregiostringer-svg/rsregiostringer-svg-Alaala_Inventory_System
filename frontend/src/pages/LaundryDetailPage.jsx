import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Skeleton, CardSkeleton } from '../components/common/Skeleton';
import AdvanceStageModal from '../components/laundry/AdvanceStageModal';
import { formatDate, formatDateTime, formatDateTimeDisplay, LAUNDRY_STATUS_MAP } from '../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shirt,
  Calendar,
  User,
  Building2,
  FileText,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Shield
} from 'lucide-react';

export default function LaundryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isMasterAdmin } = useAuth();
  const { pollTick, subscribe } = useRealtime();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

  // Delete modal state for Master Admin
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/laundry/${id}/`);
      setRecord(res);
    } catch (err) {
      setError(err.message || 'Unable to load laundry record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord, pollTick]);

  useEffect(() => {
    const unsub = subscribe('laundry.stage.updated', (data) => {
      if (data && data.id === parseInt(id, 10)) {
        fetchRecord();
      }
    });
    return () => unsub();
  }, [subscribe, id, fetchRecord]);

  const handleDeleteBatch = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/laundry/${id}/`);
      setIsDeleteModalOpen(false);
      navigate('/laundry');
    } catch (err) {
      alert(err.message || 'Failed to delete laundry record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Progressive Skeletal Loading View
  if (loading && !record) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/laundry')} icon={ArrowLeft}>
            Back to Monitoring Sheet
          </Button>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <Card title="Accountability & Process Progression" subtitle="Loading tracking milestones...">
          <CardSkeleton rows={6} />
        </Card>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-100">Record Not Found</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">{error || 'Laundry record does not exist.'}</p>
        <Button variant="secondary" onClick={() => navigate('/laundry')} icon={ArrowLeft}>
          Back to Laundry Sheet
        </Button>
      </div>
    );
  }

  const statusMeta = LAUNDRY_STATUS_MAP[record.status] || { label: record.status, variant: 'neutral' };

  const stages = [
    {
      num: 1,
      key: 'in',
      name: '1. Laundry IN (Intake & Receiving)',
      date: record.laundry_in_date,
      time: record.laundry_in_time,
      shift: record.laundry_in_shift,
      inCharge: record.laundry_in_charge,
      completed: true,
    },
    {
      num: 2,
      key: 'laba',
      name: '4. Laba (Washing)',
      date: record.laba_date,
      time: record.laba_time,
      shift: record.laba_shift,
      inCharge: record.laba_in_charge,
      completed: !!record.laba_date,
    },
    {
      num: 3,
      key: 'banlaw',
      name: '5. Banlaw (Rinsing)',
      date: record.banlaw_date,
      time: record.banlaw_time,
      shift: record.banlaw_shift,
      inCharge: record.banlaw_in_charge,
      completed: !!record.banlaw_date,
    },
    {
      num: 4,
      key: 'sampay',
      name: '6. Sampay (Hanging & Drying)',
      date: record.sampay_date,
      time: record.sampay_time,
      shift: record.sampay_shift,
      inCharge: record.sampay_in_charge,
      completed: !!record.sampay_date,
    },
    {
      num: 5,
      key: 'pinaw',
      name: '7. Pinaw (Airing / Spin Dryer)',
      date: record.pinaw_date,
      time: record.pinaw_time,
      shift: record.pinaw_shift,
      inCharge: record.pinaw_in_charge,
      completed: !!record.pinaw_date,
    },
    {
      num: 6,
      key: 'tiklop',
      name: '8. Tiklop (Folding & Inspection)',
      date: record.tiklop_date,
      time: record.tiklop_time,
      shift: record.tiklop_shift,
      inCharge: record.tiklop_in_charge,
      completed: !!record.tiklop_date,
    },
    {
      num: 7,
      key: 'return',
      name: '9. Date Returned / Delivered',
      date: record.date_returned,
      time: record.time_returned,
      shift: null,
      inCharge: record.returned_by,
      completed: !!record.date_returned,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/laundry')} icon={ArrowLeft}>
          Back to Monitoring Sheet
        </Button>
        <div className="flex items-center gap-2">
          {/* Master Admin Delete Button */}
          {isMasterAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/60"
              icon={Trash2}
            >
              Delete Batch
            </Button>
          )}

          {record.status !== 'RETURNED' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedStage(null);
                setIsAdvanceOpen(true);
              }}
            >
              Advance Next Stage
            </Button>
          )}
        </div>
      </div>

      {/* Batch Overview Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100">{record.item}</h1>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
            <span>Batch ID: #{record.id}</span>
            <span>&bull;</span>
            <span>Quantity: <strong className="text-amber-400 font-bold">{record.quantity} pcs</strong></span>
            <span>&bull;</span>
            <span>Origin: <strong className="text-amber-300 font-medium">{record.location_details?.name || 'NO CODE'}</strong></span>
          </p>
        </div>

        <div className="text-right text-xs text-slate-400">
          <p>Encoded by: <span className="font-semibold text-slate-200">{record.encoded_by}</span></p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Logged: {formatDateTime(record.created_at)}</p>
        </div>
      </div>

      {/* Full Process Timeline */}
      <Card
        title="Accountability & Process Progression"
        subtitle="Chronological audit of personnel responsible for each stage. Click 'Edit / Add Personnel' to update names for banlaw, sampay, laba, etc."
      >
        <div className="space-y-3.5">
          {stages.map((st) => (
            <div
              key={st.key}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                st.completed
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-slate-950/20 border-dashed border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    st.completed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {st.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : st.num}
                </div>
                <div>
                  <h4 className={`text-sm font-semibold ${st.completed ? 'text-slate-100' : 'text-slate-400'}`}>
                    {st.name}
                  </h4>
                  {st.completed ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Handled by:{' '}
                      <strong className="text-amber-400 font-semibold">{st.inCharge || 'Staff'}</strong>
                      {st.shift && (
                        <>
                          {' '}&bull; Shift: <span className="text-slate-300 font-medium">{st.shift}</span>
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 mt-0.5">Pending completion</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {st.completed && (
                  <span className="text-xs font-mono text-slate-300 font-medium">
                    {formatDateTimeDisplay(st.date, st.time)}
                  </span>
                )}
                <Button
                  variant={st.completed ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedStage(st.key);
                    setIsAdvanceOpen(true);
                  }}
                  icon={st.completed ? Edit2 : null}
                >
                  {st.completed ? 'Edit Personnel / Info' : 'Complete Stage'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Batch Notes & Additional Details */}
      {record.notes && (
        <Card title="Special Washing & Handling Notes">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            {record.notes}
          </p>
        </Card>
      )}

      {/* Advance Stage Modal */}
      <AdvanceStageModal
        isOpen={isAdvanceOpen}
        onClose={() => {
          setIsAdvanceOpen(false);
          setSelectedStage(null);
        }}
        record={record}
        targetStage={selectedStage}
        currentUser={user}
        onSuccess={() => fetchRecord()}
      />

      {/* Master Admin Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
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
                Batch #{record.id} &bull; <strong>{record.item}</strong> ({record.quantity} pcs) originating from{' '}
                <strong>{record.location_details?.name || 'NO CODE'}</strong>.
              </p>
              <p className="mt-2 text-rose-400/90 font-medium">
                This operation is irreversible and will be permanently recorded in the system audit logs.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteBatch}
              loading={deleteLoading}
              icon={Trash2}
            >
              Permanently Delete Batch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
