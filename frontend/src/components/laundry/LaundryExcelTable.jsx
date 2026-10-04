import React from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { LAUNDRY_STATUS_MAP, formatDate } from '../../utils/formatters';
import { CheckCircle2, ArrowRightCircle, Eye } from 'lucide-react';

/**
 * Exact table format required by Alaala Funeral Homes:
 * Displays Date, Shift, and In Charge stacked inside process cells.
 */
export default function LaundryExcelTable({
  records = [],
  onAdvanceStage,
  onViewDetail,
  loading = false,
}) {
  const renderProcessCell = (date, shift, inCharge, stageLabel, stageKey, record) => {
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
      <div className="flex flex-col justify-center p-2 rounded-md bg-slate-950/60 border border-slate-800 text-xs min-w-[130px] leading-tight">
        <span className="font-semibold text-slate-100">{formatDate(date)}</span>
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
          Exact process flow: IN &rarr; Laba &rarr; Banlaw &rarr; Sampay &rarr; Pinaw &rarr; Tiklop &rarr; Returned
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
                No laundry records found.
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
                    <div className="flex flex-col justify-center p-2 rounded-md bg-slate-950/60 border border-slate-800 text-xs min-w-[140px] leading-tight">
                      <span className="font-semibold text-slate-100">{formatDate(r.laundry_in_date)}</span>
                      <span className="text-slate-400 text-[11px] mt-0.5">{r.laundry_in_shift}</span>
                      <span className="text-amber-400 text-[11px] font-medium mt-0.5 truncate" title={r.laundry_in_charge}>
                        {r.laundry_in_charge}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800/80">
                        #{r.id} &bull; {r.location_details?.name || 'Chapel'}
                      </span>
                    </div>
                  </td>

                  {/* 2. Items */}
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-100 max-w-[160px] truncate" title={r.item}>
                      {r.item}
                    </div>
                    {r.notes && (
                      <p className="text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5" title={r.notes}>
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
                    {renderProcessCell(r.laba_date, r.laba_shift, r.laba_in_charge, 'Laba', 'laba', r)}
                  </td>

                  {/* 5. Banlaw (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.banlaw_date, r.banlaw_shift, r.banlaw_in_charge, 'Banlaw', 'banlaw', r)}
                  </td>

                  {/* 6. Sampay (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.sampay_date, r.sampay_shift, r.sampay_in_charge, 'Sampay', 'sampay', r)}
                  </td>

                  {/* 7. Pinaw (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.pinaw_date, r.pinaw_shift, r.pinaw_in_charge, 'Pinaw', 'pinaw', r)}
                  </td>

                  {/* 8. Tiklop (Date/Shift/ In Charge) */}
                  <td className="p-2">
                    {renderProcessCell(r.tiklop_date, r.tiklop_shift, r.tiklop_in_charge, 'Tiklop', 'tiklop', r)}
                  </td>

                  {/* 9. Date Returned/ By */}
                  <td className="p-2.5">
                    {r.date_returned ? (
                      <div className="flex flex-col justify-center p-2 rounded-md bg-emerald-950/20 border border-emerald-900/50 text-xs min-w-[130px] leading-tight">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(r.date_returned)}
                        </span>
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
                            Mark Returned
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 10. Encoded By */}
                  <td className="p-2.5">
                    <span className="text-slate-300 text-xs font-medium">{r.encoded_by}</span>
                  </td>

                  {/* Status */}
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <Badge variant={statusMeta.variant} size="sm">
                      {statusMeta.label}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onViewDetail && (
                        <button
                          type="button"
                          onClick={() => onViewDetail(r)}
                          title="View Details & Timeline"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onAdvanceStage && r.status !== 'RETURNED' && (
                        <button
                          type="button"
                          onClick={() => onAdvanceStage(r)}
                          title="Advance to Next Stage"
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-colors cursor-pointer"
                        >
                          <ArrowRightCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
