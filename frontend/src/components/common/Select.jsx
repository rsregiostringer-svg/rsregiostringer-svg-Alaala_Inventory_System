import React from 'react';

export default function Select({
  label,
  id,
  options = [],
  error,
  helperText,
  className = '',
  containerClassName = '',
  required = false,
  placeholder = 'Select an option',
  ...props
}) {
  const selectId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-amber-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-xs">
        <select
          id={selectId}
          className={`block w-full rounded-lg bg-slate-950/60 border ${
            error ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-amber-500/80'
          } px-3.5 py-2 text-sm text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500/30 transition-colors disabled:opacity-50 disabled:bg-slate-900/50 appearance-none cursor-pointer ${className}`}
          {...props}
        >
          {placeholder && <option value="" className="bg-slate-900 text-slate-400">{placeholder}</option>}
          {options.map((opt) => {
            const value = typeof opt === 'object' ? opt.value : opt;
            const labelText = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={value} value={value} className="bg-slate-900 text-slate-100">
                {labelText}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
}
