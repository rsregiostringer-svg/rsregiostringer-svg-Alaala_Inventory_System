import React from 'react';

/**
 * Modern shimmer skeleton loader components for Alaala Funeral Homes.
 * Provides progressive rendering so users see instant layouts without blocking spinners.
 */

export function Skeleton({ className = '', variant = 'rectangular', ...props }) {
  const baseClasses =
    'relative overflow-hidden bg-white/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-slate-700/30 before:to-transparent';

  const variantClasses = {
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    text: 'rounded h-4',
  }[variant] || 'rounded-lg';

  return <div className={`${baseClasses} ${variantClasses} ${className}`} {...props} />;
}

export function StatSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-3.5" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <Skeleton className="w-32 h-8" />
      <Skeleton className="w-48 h-3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-[#F0F2F5] border-b border-slate-200 flex items-center justify-between">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
      <div className="divide-y divide-slate-200/60 p-2 space-y-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 p-3">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-4 ${cIdx === 0 ? 'w-1/4' : cIdx === 1 ? 'w-1/5' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ lines = 4 }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-40 h-5" />
          <Skeleton className="w-64 h-3" />
        </div>
        <Skeleton className="w-20 h-8 rounded-lg" />
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: lines }).map((_, idx) => (
          <Skeleton key={idx} className={`h-4 ${idx === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
