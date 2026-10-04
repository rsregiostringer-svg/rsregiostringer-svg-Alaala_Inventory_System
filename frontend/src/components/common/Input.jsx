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
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-amber-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-lg bg-slate-950/60 border ${
            error ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-amber-500/80'
          } ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/30 transition-colors disabled:opacity-50 disabled:bg-slate-900/50 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
}
