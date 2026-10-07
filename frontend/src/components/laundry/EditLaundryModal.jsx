import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

export default function EditLaundryModal({ isOpen, onClose, record, locations, staffList, onSuccess }) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record && isOpen) {
      // Setup edit form
      const initialItems = record.items?.length > 0
        ? record.items.map(i => ({ ...i }))
        : [{ item_description: record.item || '', quantity: record.quantity || '', unit: 'pcs' }];
        
      setFormData({
        location: record.location,
        items: initialItems,
        notes: record.notes || '',
        
        laundry_in_date: record.laundry_in_date || '',
        laundry_in_time: record.laundry_in_time || '',
        laundry_in_shift: record.laundry_in_shift || '',
        laundry_in_charge: record.laundry_in_charge || '',
        
        laba_date: record.laba_date || '',
        laba_time: record.laba_time || '',
        laba_shift: record.laba_shift || '',
        laba_in_charge: record.laba_in_charge || '',
        
        banlaw_date: record.banlaw_date || '',
        banlaw_time: record.banlaw_time || '',
        banlaw_shift: record.banlaw_shift || '',
        banlaw_in_charge: record.banlaw_in_charge || '',
        
        sampay_date: record.sampay_date || '',
        sampay_time: record.sampay_time || '',
        sampay_shift: record.sampay_shift || '',
        sampay_in_charge: record.sampay_in_charge || '',
        
        pinaw_date: record.pinaw_date || '',
        pinaw_time: record.pinaw_time || '',
        pinaw_shift: record.pinaw_shift || '',
        pinaw_in_charge: record.pinaw_in_charge || '',
        
        tiklop_date: record.tiklop_date || '',
        tiklop_time: record.tiklop_time || '',
        tiklop_shift: record.tiklop_shift || '',
        tiklop_in_charge: record.tiklop_in_charge || '',
        
        date_returned: record.date_returned || '',
        returned_time: record.returned_time || '',
        returned_by: record.returned_by || ''
      });
      setError('');
    }
  }, [record, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData) return;

    // Validate items
    const validItems = formData.items.filter(i => i.item_description.trim() !== '');
    if (validItems.length === 0) {
      setError('At least one item with a description is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      items: validItems
    };

    const dateTimeFields = [
      'laundry_in_date', 'laundry_in_time',
      'laba_date', 'laba_time',
      'banlaw_date', 'banlaw_time',
      'sampay_date', 'sampay_time',
      'pinaw_date', 'pinaw_time',
      'tiklop_date', 'tiklop_time',
      'date_returned', 'returned_time'
    ];

    dateTimeFields.forEach(field => {
      if (!payload[field]) {
        payload[field] = null;
      }
    });

    try {
      await api.put(`/laundry/${record.id}/`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update laundry record.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_description: '', quantity: '', unit: 'pcs' }]
    });
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!formData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Laundry Record"
      subtitle={`Correct details for Batch #${record?.id}`}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General info */}
          <div className="md:col-span-2">
            <Select
              label="Location"
              required
              options={locations.map(l => ({
                value: l.id,
                label: l.name === 'NO CODE' ? 'NO CODE (Uncoded)' : l.name,
              }))}
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </div>

          {/* Items Breakdown */}
          <div className="md:col-span-2 space-y-3 p-3 bg-slate-50/80 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Items ({formData.items.length})
              </label>
            </div>
            
            {formData.items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2 rounded border border-slate-200">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Item (e.g. Curtain)"
                    required
                    value={item.item_description}
                    onChange={(e) => handleItemChange(index, 'item_description', e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-24">
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    required
                    value={item.quantity}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val === '0') val = '1';
                      const parsed = parseInt(val, 10);
                      handleItemChange(index, 'quantity', isNaN(parsed) ? '' : parsed);
                    }}
                  />
                </div>
                <div className="w-full sm:w-24">
                  <Select
                    options={[{ value: 'pcs', label: 'pcs' }, { value: 'set', label: 'set' }, { value: 'dozen', label: 'dozen' }, { value: 'kg', label: 'kg' }]}
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                  />
                </div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded mt-1 sm:mt-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="text-xs font-semibold text-[#0866FF] hover:text-blue-700 hover:underline flex items-center gap-1 mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add More Item
            </button>
          </div>
        </div>



        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
