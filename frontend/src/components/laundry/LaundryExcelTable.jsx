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
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/30 border border-dashed border-slate-800 text-xs min-h-[72px]">
          <span className="text-slate-600 font-medium">—</span>
          {onAdvanceStage && record.status !== 'RETURNED' && (
            <button
              type="button"
              onClick={() => onAdvanceStage(record, stageKey)}
              className="mt-1.5 px-2 py-0.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors cursor-pointer"
            >
              + {stageLabel}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs min-w-[125px]">
        <span className="font-semibold text-slate-200">{formatDate(date)}</span>
        <span className="text-slate-400 text-[11px] capitalize">{shift || 'Standard'} Shift</span>
        <span className="text-amber-400 font-medium text-[11px] truncate mt-0.5" title={inCharge}>
          {inCharge || 'Staff'}
        </span>
      </div>
    );
  };

  return (
    <div className="relative overflow-x-auto rounded-xl border border-slate-800 shadow-xl bg-slate-900/90">
      <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10">
          <tr className="divide-x divide-slate-800">
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px] text-amber-500/90">
              1. LAUNDRY IN
            </th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[130px]">2. ITEMS</th>
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[60px]">3. QTY</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[130px]">4. LABA</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[130px]">5. BANLAW</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[130px]">6. SAMPAY</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[130px]">7. PINAW</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[130px]">8. TIKLOP</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">9. DATE RETURNED / BY</th>
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[110px]">10. ENCODED BY</th>
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[100px]">STATUS</th>
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[90px]">ACTIONS</th>
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
                  {/* 1. LAUNDRY IN */}
                  <td className="p-2.5">
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-slate-100">{formatDate(r.laundry_in_date)}</span>
                      <span className="text-slate-400 text-[11px]">{r.laundry_in_shift}</span>
                      <span className="text-amber-400 text-[11px] font-medium">{r.laundry_in_charge}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">#{r.id} ({r.location_details?.name || 'Chapel'})</span>
                    </div>
                  </td>

                  {/* 2. ITEMS */}
                  <td className="p-2.5">
                    <div className="font-medium text-slate-100 max-w-[160px] truncate" title={r.item}>
                      {r.item}
                    </div>
                    {r.notes && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[160px]" title={r.notes}>
                        {r.notes}
                      </p>
                    )}
                  </td>

                  {/* 3. QUANTITY */}
                  <td className="p-2.5 text-center font-bold text-amber-400 text-sm">
                    {r.quantity}
                  </td>

                  {/* 4. LABA */}
                  <td className="p-2">
                    {renderProcessCell(r.laba_date, r.laba_shift, r.laba_in_charge, 'Laba', 'laba', r)}
                  </td>

                  {/* 5. BANLAW */}
                  <td className="p-2">
                    {renderProcessCell(r.banlaw_date, r.banlaw_shift, r.banlaw_in_charge, 'Banlaw', 'banlaw', r)}
                  </td>

                  {/* 6. SAMPAY */}
                  <td className="p-2">
                    {renderProcessCell(r.sampay_date, r.sampay_shift, r.sampay_in_charge, 'Sampay', 'sampay', r)}
                  </td>

                  {/* 7. PINAW */}
                  <td className="p-2">
                    {renderProcessCell(r.pinaw_date, r.pinaw_shift, r.pinaw_in_charge, 'Pinaw', 'pinaw', r)}
                  </td>

                  {/* 8. TIKLOP */}
                  <td className="p-2">
                    {renderProcessCell(r.tiklop_date, r.tiklop_shift, r.tiklop_in_charge, 'Tiklop', 'tiklop', r)}
                  </td>

                  {/* 9. DATE RETURNED / BY */}
                  <td className="p-2.5">
                    {r.date_returned ? (
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(r.date_returned)}
                        </span>
                        <span className="text-slate-300 text-[11px] mt-0.5">By: {r.returned_by}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/30 border border-dashed border-slate-800 text-xs min-h-[72px]">
                        <span className="text-slate-600 font-medium">—</span>
                        {onAdvanceStage && (
                          <button
                            type="button"
                            onClick={() => onAdvanceStage(r, 'return')}
                            className="mt-1.5 px-2 py-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition-colors cursor-pointer"
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 10. ENCODED BY */}
                  <td className="p-2.5">
                    <span className="text-slate-300 text-xs">{r.encoded_by}</span>
                  </td>

                  {/* STATUS */}
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <Badge variant={statusMeta.variant} size="sm">
                      {statusMeta.label}
                    </Badge>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onViewDetail && (
                        <button
                          type="button"
                          onClick={() => onViewDetail(r)}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onAdvanceStage && r.status !== 'RETURNED' && (
                        <button
                          type="button"
                          onClick={() => onAdvanceStage(r)}
                          title="Advance Next Stage"
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
