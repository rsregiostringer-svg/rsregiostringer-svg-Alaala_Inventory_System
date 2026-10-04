import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-900/20 active:scale-[0.98]',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm active:scale-[0.98]',
  outline: 'bg-transparent border border-slate-700 hover:border-slate-500 text-slate-200 hover:bg-slate-800/50 active:scale-[0.98]',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/30 active:scale-[0.98]',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
  icon: 'p-2 rounded-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none gap-2 ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-current" />
      ) : null}
      {children}
    </button>
  );
}
