import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import AdvanceStageModal from '../components/laundry/AdvanceStageModal';
import { formatDate, formatDateTime, LAUNDRY_STATUS_MAP } from '../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shirt,
  Calendar,
  User,
  Building2,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function LaundryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pollTick, subscribe } = useRealtime();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

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

  if (loading && !record) {
    return <LoadingState message="Loading laundry timeline..." />;
  }

  if (error || !record) {
    return (
      <div className="text-center py-12">
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
      name: 'Laundry IN (Intake)',
      date: record.laundry_in_date,
      shift: record.laundry_in_shift,
      inCharge: record.laundry_in_charge,
      completed: true,
    },
    {
      num: 2,
      key: 'laba',
      name: 'Laba (Washing)',
      date: record.laba_date,
      shift: record.laba_shift,
      inCharge: record.laba_in_charge,
      completed: !!record.laba_date,
    },
    {
      num: 3,
      key: 'banlaw',
      name: 'Banlaw (Rinsing)',
      date: record.banlaw_date,
      shift: record.banlaw_shift,
      inCharge: record.banlaw_in_charge,
      completed: !!record.banlaw_date,
    },
    {
      num: 4,
      key: 'sampay',
      name: 'Sampay (Hanging/Drying)',
      date: record.sampay_date,
      shift: record.sampay_shift,
      inCharge: record.sampay_in_charge,
      completed: !!record.sampay_date,
    },
    {
      num: 5,
      key: 'pinaw',
      name: 'Pinaw (Ironing/Pressing)',
      date: record.pinaw_date,
      shift: record.pinaw_shift,
      inCharge: record.pinaw_in_charge,
      completed: !!record.pinaw_date,
    },
    {
      num: 6,
      key: 'tiklop',
      name: 'Tiklop (Folding)',
      date: record.tiklop_date,
      shift: record.tiklop_shift,
      inCharge: record.tiklop_in_charge,
      completed: !!record.tiklop_date,
    },
    {
      num: 7,
      key: 'return',
      name: 'Date Returned / By',
      date: record.date_returned,
      shift: 'Delivered',
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
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
            <span>Batch ID: #{record.id}</span>
            <span>&bull;</span>
            <span>Quantity: <strong className="text-amber-400 font-bold">{record.quantity} pcs</strong></span>
            <span>&bull;</span>
            <span>Origin: <strong>{record.location_details?.name || 'Chapel'}</strong></span>
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
        subtitle="Chronological audit of personnel responsible for each physical stage."
      >
        <div className="space-y-4">
          {stages.map((st, idx) => (
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
                      Handled by: <strong className="text-amber-400 font-medium">{st.inCharge || 'Staff'}</strong> ({st.shift} Shift)
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 mt-0.5">Pending completion</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {st.completed ? (
                  <span className="text-xs font-mono text-slate-300 font-medium">
                    {formatDate(st.date)}
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStage(st.key);
                      setIsAdvanceOpen(true);
                    }}
                  >
                    Complete Stage
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Advance Modal */}
      <AdvanceStageModal
        isOpen={isAdvanceOpen}
        onClose={() => setIsAdvanceOpen(false)}
        record={record}
        targetStage={selectedStage}
        currentUser={user}
        onSuccess={() => fetchRecord()}
      />
    </div>
  );
}
