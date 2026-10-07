import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { api } from '../../services/api';
import { CheckCircle2 } from 'lucide-react';

const STAGES = [
  { value: 'laba', label: '4. Laba (Washing)' },
  { value: 'banlaw', label: '5. Banlaw (Rinsing)' },
  { value: 'sampay', label: '6. Sampay (Hanging/Drying)' },
  { value: 'pinaw', label: '7. Pinaw (Ironing/Pressing)' },
  { value: 'tiklop', label: '8. Tiklop (Folding)' },
  { value: 'return', label: '9. Return (Delivered to Location)' },
  { value: 'in', label: '1. Laundry IN (Intake & Receiving)' },
];

export default function AdvanceStageModal({
  isOpen,
  onClose,
  record,
  targetStage = null,
  currentUser = null,
  onSuccess,
}) {
  const [stage, setStage] = useState('laba');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [shift, setShift] = useState('8am to 5pm');
  const [inCharge, setInCharge] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch staff list for quick selection
  useEffect(() => {
    let isMounted = true;
    api.get('/users/')
      .then((data) => {
        if (!isMounted) return;
        const users = data.results || data || [];
        setStaffList(users);
      })
      .catch((err) => console.warn('Could not load staff list for laundry:', err));
    return () => { isMounted = false; };
  }, []);

  const populateStageData = useCallback((targetKey, rec) => {
    if (!rec) return;

    let existingDate = '';
    let existingTime = '';
    let existingShift = '8am to 5pm';
    let existingInCharge = '';

    if (targetKey === 'in') {
      existingDate = rec.laundry_in_date;
      existingTime = rec.laundry_in_time;
      existingShift = rec.laundry_in_shift;
      existingInCharge = rec.laundry_in_charge;
    } else if (targetKey === 'laba') {
      existingDate = rec.laba_date;
      existingTime = rec.laba_time;
      existingShift = rec.laba_shift;
      existingInCharge = rec.laba_in_charge;
    } else if (targetKey === 'banlaw') {
      existingDate = rec.banlaw_date;
      existingTime = rec.banlaw_time;
      existingShift = rec.banlaw_shift;
      existingInCharge = rec.banlaw_in_charge;
    } else if (targetKey === 'sampay') {
      existingDate = rec.sampay_date;
      existingTime = rec.sampay_time;
      existingShift = rec.sampay_shift;
      existingInCharge = rec.sampay_in_charge;
    } else if (targetKey === 'pinaw') {
      existingDate = rec.pinaw_date;
      existingTime = rec.pinaw_time;
      existingShift = rec.pinaw_shift;
      existingInCharge = rec.pinaw_in_charge;
    } else if (targetKey === 'tiklop') {
      existingDate = rec.tiklop_date;
      existingTime = rec.tiklop_time;
      existingShift = rec.tiklop_shift;
      existingInCharge = rec.tiklop_in_charge;
    } else if (targetKey === 'return') {
      existingDate = rec.date_returned;
      existingTime = rec.returned_time;
      existingShift = '8am to 5pm';
      existingInCharge = rec.returned_by;
    }

    const defaultName = currentUser
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username
      : '';

    setDate(existingDate || new Date().toISOString().split('T')[0]);
    setTime(existingTime || new Date().toTimeString().slice(0, 5));
    setShift(existingShift || '8am to 5pm');
    setInCharge(existingInCharge || defaultName);
  }, [currentUser]);

  useEffect(() => {
    if (record && isOpen) {
      let initialStage = targetStage;
      if (!initialStage) {
        if (!record.laba_date) initialStage = 'laba';
        else if (!record.banlaw_date) initialStage = 'banlaw';
        else if (!record.sampay_date) initialStage = 'sampay';
        else if (!record.pinaw_date) initialStage = 'pinaw';
        else if (!record.tiklop_date) initialStage = 'tiklop';
        else initialStage = 'return';
      }
      setStage(initialStage);
      populateStageData(initialStage, record);
      setError('');
    }
  }, [record, targetStage, isOpen, populateStageData]);

  const handleStageSelect = (newStage) => {
    setStage(newStage);
    populateStageData(newStage, record);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inCharge.trim()) {
      setError('Please specify the person in charge.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/laundry/${record.id}/advance_stage/`, {
        stage,
        date,
        time,
        shift,
        in_charge: inCharge.trim(),
      });

      if (onSuccess) onSuccess(response.record || response);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update laundry stage.');
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  const getStagePersonnel = (key) => {
    if (key === 'in') return record.laundry_in_charge;
    if (key === 'laba') return record.laba_in_charge;
    if (key === 'banlaw') return record.banlaw_in_charge;
    if (key === 'sampay') return record.sampay_in_charge;
    if (key === 'pinaw') return record.pinaw_in_charge;
    if (key === 'tiklop') return record.tiklop_in_charge;
    if (key === 'return') return record.returned_by;
    return '';
  };

  const isCurrentStageRecorded = !!getStagePersonnel(stage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCurrentStageRecorded ? 'Edit Stage & Personnel In Charge' : 'Advance Laundry Stage'}
      subtitle={`Batch #${record.id} - ${record.item} (${Number(record.total_quantity || record.quantity)} pcs)`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Batch Overview pill */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
          <div>
            <span className="text-slate-500">Chapel / Tag: </span>
            <span className="font-bold text-slate-900">
              {record.location_details?.name || 'NO CODE'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Status: </span>
            <span className="font-bold text-blue-600">{record.status_display || record.status}</span>
          </div>
        </div>

        {/* Stage Fixed */}
        <div>
          <div className="mb-1 block text-[13px] font-semibold text-slate-700">Process Stage</div>
          <div className="p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-sm font-medium">
            {STAGES.find(s => s.value === stage)?.label || stage}
          </div>
          {isCurrentStageRecorded && (
            <div className="mt-2 p-2 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Current recorded personnel: <strong>{getStagePersonnel(stage)}</strong></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Date of Completion"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Input
            type="time"
            label="Time (Hour)"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <Select
          label="Shift"
          required
          options={[
            { value: '8am to 5pm', label: '8am to 5pm' },
            { value: '4pm to 1am', label: '4pm to 1am' },
            { value: '12midnight to 9am', label: '12midnight to 9am' },
          ]}
          value={shift}
          onChange={(e) => setShift(e.target.value)}
        />

        {/* In Charge Input with Staff Suggestions */}
        <div className="space-y-1.5">
          <Input
            label={
              stage === 'return'
                ? 'Returned By (Delivered By)'
                : stage === 'laba'
                ? 'In Charge of Laba (Washing)'
                : stage === 'banlaw'
                ? 'In Charge of Banlaw (Rinsing)'
                : stage === 'sampay'
                ? 'In Charge of Sampay (Drying)'
                : stage === 'pinaw'
                ? 'In Charge of Pinaw (Ironing)'
                : stage === 'tiklop'
                ? 'In Charge of Tiklop (Folding)'
                : 'In Charge (Accountable Personnel)'
            }
            placeholder="Type name (e.g. Maria Santos, Juan Dela Cruz)"
            required
            value={inCharge}
            onChange={(e) => setInCharge(e.target.value)}
            helperText="The personnel accountable for physically performing this step."
            list="staff-datalist"
          />

          <datalist id="staff-datalist">
            {staffList.map((s) => {
              const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username;
              return <option key={s.id} value={fullName} />;
            })}
          </datalist>

          {/* Quick Staff Suggestion Badges */}
          {staffList.length > 0 && (
            <div className="pt-1">
              <span className="text-[11px] text-slate-500 block mb-1">Quick Select Staff:</span>
              <div className="flex flex-wrap gap-1.5">
                {staffList.slice(0, 6).map((s) => {
                  const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username;
                  const isSelected = inCharge.toLowerCase() === name.toLowerCase();
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setInCharge(name)}
                      className={`px-2 py-0.5 text-xs rounded-md border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isCurrentStageRecorded ? 'Save Stage Changes' : 'Confirm Stage Completion'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
