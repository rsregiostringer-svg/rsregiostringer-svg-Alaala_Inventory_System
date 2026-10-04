import React from 'react';

const VARIANT_STYLES = {
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  info: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  primary: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
  accent: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  secondary: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  neutral: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};

export default function Badge({ children, variant = 'neutral', className = '', size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full tracking-wide shadow-xs ${sizeClasses} ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
