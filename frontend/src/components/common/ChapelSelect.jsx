import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const ChapelSelect = ({ value, onChange, label = "Chapel", disabled = false, required = false, name = "chapel", allowResidence = false, className = "" }) => {
  const [chapels, setChapels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapels = async () => {
      try {
        const response = await api.get('/chapels/');
        const chapelList = response.results || response;
        setChapels(chapelList);
      } catch (error) {
        console.error('Error fetching chapels:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapels();
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled || loading}
        required={required}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-blue-600 transition-colors disabled:opacity-50 disabled:bg-slate-100"
      >
        <option value="">
          -- Select Chapel --
        </option>
        {allowResidence && (
          <option value="RESIDENCE">Residence / House Viewing</option>
        )}
        {loading ? (
          <option disabled>Loading...</option>
        ) : (
          chapels.filter(c => c.is_active || c.id === value).map((chapel) => {
            const isDisabled = chapel.available <= 0 && chapel.id !== value;
            return (
              <option key={chapel.id} value={chapel.id} disabled={isDisabled}>
                {chapel.name} {isDisabled ? '(Full)' : `(Available: ${chapel.available})`} {chapel.is_active ? '' : '(Deactivated)'}
              </option>
            );
          })
        )}
      </select>
    </div>
  );
};

export default ChapelSelect;
