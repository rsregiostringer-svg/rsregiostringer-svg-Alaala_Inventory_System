import React from 'react';

export default function Input({
  label,
  id,
  error,
  helperText,
  icon: Icon,
  className = '',
  containerClassName = '',
  required = false,
  onChange,
  ...props
}) {
  const handleChange = (e) => {
    let val = e.target.value;
    if (props.type === 'number' && val) {
      if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
        val = val.replace(/^0+/, '');
        e.target.value = val;
      }
    } else if ((!props.type || props.type === 'text') && val.length > 0) {
      const name = (props.name || id || '').toLowerCase();
      if (!name.includes('username') && !name.includes('email') && !name.includes('password')) {
        const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
        if (val !== capitalized) {
          e.target.value = capitalized;
        }
      }
    }
    if (onChange) onChange(e);
  };

  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-800 mb-1.5">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-lg bg-white border ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600'
              : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
          } ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors disabled:opacity-50 disabled:bg-slate-100 ${className}`}
          onChange={handleChange}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
