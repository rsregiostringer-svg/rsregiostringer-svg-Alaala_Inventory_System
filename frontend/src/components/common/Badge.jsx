import React from 'react';

const VARIANT_STYLES = {
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  yellow: 'bg-amber-50 text-amber-800 border border-amber-200',
  red: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  // Backward compatibility mappings:
  success: 'bg-blue-50 text-blue-700 border border-blue-200',
  primary: 'bg-blue-50 text-blue-700 border border-blue-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  accent: 'bg-blue-50 text-blue-700 border border-blue-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
};

export default function Badge({ children, variant = 'neutral', className = '', size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full tracking-wide ${sizeClasses} ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
