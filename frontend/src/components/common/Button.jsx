import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs active:scale-[0.99]',
  secondary: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium shadow-xs active:scale-[0.99]',
  outline: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium active:scale-[0.99]',
  danger: 'bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs active:scale-[0.99]',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs active:scale-[0.99]',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 font-medium',
  success: 'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs active:scale-[0.99]',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg',
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
      className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none gap-2 ${sizeClass} ${variantClass} ${className}`}
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
