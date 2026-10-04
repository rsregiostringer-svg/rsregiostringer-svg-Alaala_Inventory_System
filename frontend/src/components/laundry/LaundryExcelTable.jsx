import React from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { LAUNDRY_STATUS_MAP, formatDate, formatDateTimeDisplay } from '../../utils/formatters';
import { CheckCircle2, ArrowRightCircle, Eye, Edit2 } from 'lucide-react';

/**
 * Exact table format required by Alaala Funeral Homes:
 * Displays Date, Shift, and In Charge stacked inside process cells.
 * Allows clicking on any process cell to add or edit the personnel in charge!
 */
export default function LaundryExcelTable({
  records = [],
  onAdvanceStage,
  onViewDetail,
  loading = false,
}) {
  const renderProcessCell = (date, time, shift, inCharge, stageLabel, stageKey, record) => {
    if (!date) {
      return (
        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/20 border border-dashed border-slate-800/80 text-xs min-h-[68px]">
          <span className="text-slate-600 font-mono">—</span>
          {onAdvanceStage && record.status !== 'RETURNED' && (
            <button
              type="button"
              onClick={() => onAdvanceStage(record, stageKey)}
              className="mt-1 px-2 py-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors cursor-pointer"
            >
              + {stageLabel}
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        onClick={() => onAdvanceStage && onAdvanceStage(record, stageKey)}
        className="group relative flex flex-col justify-center p-2 rounded-md bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 text-xs min-w-[130px] leading-tight cursor-pointer transition-all"
        title="Click to edit stage or change person in charge"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-slate-100">{formatDateTimeDisplay(date, time)}</span>
          <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <span className="text-slate-400 text-[11px] mt-0.5">{shift || '8am to 5pm'}</span>
        <span className="text-amber-400 font-medium text-[11px] truncate mt-0.5" title={inCharge}>
          {inCharge || 'Staff'}
        </span>
      </div>
    );
  };

  return (
    <div className="relative overflow-x-auto rounded-xl border border-slate-800 shadow-xl bg-slate-900/95">
      {/* Excel Sheet Style Header Ribbon */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            EXCEL MONITORING SHEET
          </span>
          <span className="text-slate-400 text-xs">
            Showing {records.length} batch{records.length === 1 ? '' : 'es'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Tip: Click on any stage cell (Laba, Banlaw, Sampay, etc.) to view or update the person in charge.
        </span>
      </div>

      <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
        <thead className="bg-slate-950/90 text-slate-300 text-xs font-semibold sticky top-0 z-10 select-none">
          <tr className="divide-x divide-slate-800">
            {/* 1. Laundry IN (Date/ Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[160px] bg-slate-950 text-amber-400">
              <div className="font-bold">Laundry IN</div>
              <div className="text-[10px] text-slate-400 font-normal tracking-tight">(Date/ Shift/ In Charge)</div>
            </th>

            {/* 2. Items */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-slate-200">
              <div className="font-bold">Items</div>
            </th>

            {/* 3. Quantity */}
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[70px] text-slate-200">
              <div className="font-bold">Quantity</div>
            </th>

            {/* 4. Laba (Date/Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-slate-200">
              <div className="font-bold">Laba</div>
              <div className="text-[10px] text-slate-400 font-normal tracking-tight">(Date/Shift/ In Charge)</div>
            </th>

            {/* 5. Banlaw (Date/Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-slate-200">
              <div className="font-bold">Banlaw</div>
              <div className="text-[10px] text-slate-400 font-normal tracking-tight">(Date/Shift/ In Charge)</div>
            </th>

            {/* 6. Sampay (Date/Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-slate-200">
              <div className="font-bold">Sampay</div>
              <div className="text-[10px] text-slate-400 font-normal tracking-tight">(Date/Shift/ In Charge)</div>
            </th>

            {/* 7. Pinaw (Date/Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-slate-200">
              <div className="font-bold">Pinaw</div>
              <div className="text-[10px] text-slate-400 font-normal tracking-tight">(Date/Shift/ In Charge)</div>
            </th>

            {/* 8. Tiklop (Date/Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-slate-200">
              <div className="font-bold">Tiklop</div>
              <div className="text-[10px] text-slate-400 font-normal tracking-tight">(Date/Shift/ In Charge)</div>
            </th>

            {/* 9. Date Returned/ By */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[150px] text-emerald-400">
              <div className="font-bold">Date Returned/ By</div>
            </th>

            {/* 10. Encoded By */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[120px] text-slate-200">
              <div className="font-bold">Encoded By</div>
            </th>

            {/* Operational helpers */}
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[100px] text-slate-400">
              <div className="font-semibold text-[11px] uppercase">Status</div>
            </th>
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[90px] text-slate-400">
              <div className="font-semibold text-[11px] uppercase">Actions</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
          {records.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                No laundry records found for the selected date range and filters.
              </td>
            </tr>
          ) : (
            records.map((r) => {
              const statusMeta = LAUNDRY_STATUS_MAP[r.status] || {
                label: r.status,
                variant: 'neutral',
              };

              return (
                <tr key={r.id} className="divide-x divide-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  {/* 1. Laundy IN (Date/ Shift/ In Charge) */}
                  <td className="p-2.5">
                    <div
                      onClick={() => onAdvanceStage && onAdvanceStage(r, 'in')}
                      className="group flex flex-col justify-center p-2 rounded-md bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 text-xs min-w-[140px] leading-tight cursor-pointer transition-all"
                      title="Click to edit intake details or receiving person"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-100">{formatDateTimeDisplay(r.laundry_in_date, r.laundry_in_time)}</span>
                        <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <span className="text-slate-400 text-[11px] mt-0.5">{r.laundry_in_shift}</span>
                      <span className="text-amber-400 text-[11px] font-medium mt-0.5 truncate" title={r.laundry_in_charge}>
                        {r.laundry_in_charge}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <span>#{r.id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 font-medium">
                          {r.location_details?.name || 'NO CODE'}
                        </span>
                      </span>
                    </div>
                  </td>

                  {/* 2. Items */}
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-100 max-w-[160px] truncate" title={r.item}>
                      {r.item}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-amber-300 border border-slate-700">
                        {r.location_details?.name || 'NO CODE'}
                      </span>
                    </div>
                    {r.notes && (
                      <p className="text-[11px] text-slate-400 truncate max-w-[160px] mt-1" title={r.notes}>
                        {r.notes}
                      </p>
                    )}
                  </td>

                  {/* 3. Quantity */}
                  <td className="p-2.5 text-center font-bold text-amber-400 text-base">
                    {r.quantity}
                  </td>

                  {/* 4. Laba (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.laba_date, r.laba_time, r.laba_shift, r.laba_in_charge, 'Laba', 'laba', r)}
                  </td>

                  {/* 5. Banlaw (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.banlaw_date, r.banlaw_time, r.banlaw_shift, r.banlaw_in_charge, 'Banlaw', 'banlaw', r)}
                  </td>

                  {/* 6. Sampay (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.sampay_date, r.sampay_time, r.sampay_shift, r.sampay_in_charge, 'Sampay', 'sampay', r)}
                  </td>

                  {/* 7. Pinaw (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.pinaw_date, r.pinaw_time, r.pinaw_shift, r.pinaw_in_charge, 'Pinaw', 'pinaw', r)}
                  </td>

                  {/* 8. Tiklop (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.tiklop_date, r.tiklop_time, r.tiklop_shift, r.tiklop_in_charge, 'Tiklop', 'tiklop', r)}
                  </td>

                  {/* 9. Date Returned/ By */}
                  <td className="p-2.5">
                    {r.date_returned ? (
                      <div
                        onClick={() => onAdvanceStage && onAdvanceStage(r, 'return')}
                        className="group flex flex-col justify-center p-2 rounded-md bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/50 hover:border-emerald-500/50 text-xs min-w-[130px] leading-tight cursor-pointer transition-all"
                        title="Click to edit returned date or delivery person"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {formatDateTimeDisplay(r.date_returned, r.returned_time)}
                          </span>
                          <Edit2 className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <span className="text-slate-300 text-[11px] mt-0.5 truncate" title={r.returned_by}>
                          By: {r.returned_by}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/20 border border-dashed border-slate-800/80 text-xs min-h-[68px]">
                        <span className="text-slate-600 font-mono">—</span>
                        {onAdvanceStage && (
                          <button
                            type="button"
                            onClick={() => onAdvanceStage(r, 'return')}
                            className="mt-1 px-2 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors cursor-pointer"
                          >
                            + Return
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 10. Encoded By */}
                  <td className="p-2.5 whitespace-nowrap">
                    <div className="text-xs text-slate-300 font-medium">{r.encoded_by || 'Staff'}</div>
                  </td>

                  {/* Operational Status */}
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <Badge variant={statusMeta.variant} size="sm">
                      {statusMeta.label}
                    </Badge>
                  </td>

                  {/* Operational Actions */}
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewDetail && onViewDetail(r)}
                      icon={Eye}
                    >
                      Detail
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
