import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are currently no items matching your criteria.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-200 bg-[#F0F2F5]/20 ${className}`}>
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-500 mb-4 shadow-sm">
        <Icon className="w-8 h-8 text-[#0866FF]/80" />
      </div>
      <h4 className="text-base font-semibold text-slate-700">{title}</h4>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
