import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({
  currentPage = 1,
  totalCount = 0,
  pageSize = 25,
  onPageChange,
  className = '',
}) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (totalPages <= 1) return null;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-800 text-xs text-slate-400 ${className}`}>
      <div>
        Showing <span className="font-semibold text-slate-200">{startRecord}</span> to{' '}
        <span className="font-semibold text-slate-200">{endRecord}</span> of{' '}
        <span className="font-semibold text-slate-200">{totalCount}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-200 font-medium">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          icon={ChevronRight}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
