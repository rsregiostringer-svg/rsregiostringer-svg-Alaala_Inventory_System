import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { api } from '../../services/api';

const STAGES = [
  { value: 'laba', label: '4. Laba (Washing)' },
  { value: 'banlaw', label: '5. Banlaw (Rinsing)' },
  { value: 'sampay', label: '6. Sampay (Hanging/Drying)' },
  { value: 'pinaw', label: '7. Pinaw (Ironing/Pressing)' },
  { value: 'tiklop', label: '8. Tiklop (Folding)' },
  { value: 'return', label: '9. Return (Delivered to Location)' },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record) {
      // Determine next recommended stage if not specified
      if (targetStage) {
        setStage(targetStage);
      } else if (!record.laba_date) {
        setStage('laba');
      } else if (!record.banlaw_date) {
        setStage('banlaw');
      } else if (!record.sampay_date) {
        setStage('sampay');
      } else if (!record.pinaw_date) {
        setStage('pinaw');
      } else if (!record.tiklop_date) {
        setStage('tiklop');
      } else {
        setStage('return');
      }

      const defaultName = currentUser
        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username
        : '';
      setInCharge(defaultName);
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setError('');
    }
  }, [record, targetStage, currentUser, isOpen]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Advance Laundry Stage"
      subtitle={`Batch #${record.id} - ${record.item} (${record.quantity} pcs)`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="font-semibold text-slate-200">{record.location_details?.name || 'Chapel'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current Status:</span>
            <span className="font-semibold text-amber-400">{record.status_display || record.status}</span>
          </div>
        </div>

        <Select
          label="Select Target Process Stage"
          required
          options={STAGES}
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        />

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

        <Input
          label={stage === 'return' ? 'Returned By / In Charge' : 'In Charge (Accountable Personnel)'}
          placeholder="e.g. Juan Dela Cruz"
          required
          value={inCharge}
          onChange={(e) => setInCharge(e.target.value)}
          helperText="Person physically performing/verifying this laundry stage."
        />

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Confirm Stage Completion
          </Button>
        </div>
      </form>
    </Modal>
  );
}
