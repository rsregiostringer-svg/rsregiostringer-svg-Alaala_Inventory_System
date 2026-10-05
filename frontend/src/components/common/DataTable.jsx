import React from 'react';
import EmptyState from './EmptyState';
import { Skeleton } from './Skeleton';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display.',
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  className = '',
}) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-blue-50 shadow-xs ${className}`}>
      <table className="w-full text-left text-sm text-slate-800 divide-y divide-slate-200">
        <thead className="bg-blue-50 text-xs uppercase tracking-wider font-semibold text-slate-700 border-b border-blue-600">
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                className={`px-4 py-3.5 whitespace-nowrap ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-600 bg-slate-50">
          {loading ? (
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="px-4 py-3.5 whitespace-nowrap">
                    <Skeleton className={`h-4 ${cIdx === 0 ? 'w-32' : cIdx === 1 ? 'w-24' : 'w-16'}`} />
                  </td>
                ))}
              </tr>
            ))
          ) : !data || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length || 1} className="p-0">
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  actionLabel={emptyActionLabel}
                  onAction={onEmptyAction}
                />
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-slate-50/80'
                  }`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key || colIndex}
                    className={`px-4 py-3.5 whitespace-nowrap text-slate-800 ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row, rowIndex) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
