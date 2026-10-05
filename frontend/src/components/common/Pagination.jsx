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
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-200 text-xs text-slate-600 ${className}`}>
      <div>
        Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{' '}
        <span className="font-semibold text-slate-900">{endRecord}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalCount}</span> records
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <span className="px-3 py-1 bg-blue-600 text-white rounded-md font-semibold text-xs shadow-xs">
          Page {currentPage} of {totalPages}
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
