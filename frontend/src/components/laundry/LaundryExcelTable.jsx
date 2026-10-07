import React, { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { LAUNDRY_STATUS_MAP, formatDateTimeDisplay } from '../../utils/formatters';
import { CheckCircle2, Eye, Edit2, Trash2, List } from 'lucide-react';

/**
 * Clean Excel-like Laundry Monitoring Table:
 * WHITE background, BLACK text, BLUE column headers, minimal borders.
 */
export default function LaundryExcelTable({
  records = [],
  onAdvanceStage,
  onViewDetail,
  onDeleteRecord,
  isMasterAdmin = false,
  loading = false,
}) {
  const [itemBreakdownRecord, setItemBreakdownRecord] = useState(null);
  const renderProcessCell = (date, time, shift, inCharge, stageLabel, stageKey, record) => {
    if (!date) {
      return (
        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-50 border border-dashed border-slate-200 text-xs min-h-[64px]">
          <span className="text-slate-500 font-mono">—</span>
          {onAdvanceStage && record.status !== 'RETURNED' && (
            <button
              type="button"
              onClick={() => onAdvanceStage(record, stageKey)}
              className="mt-1 px-2 py-0.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
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
        className="group relative flex flex-col justify-center p-2 rounded-md bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 text-xs min-w-[130px] leading-tight cursor-pointer transition-colors shadow-2xs"
        title="Click to edit stage or change person in charge"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-slate-900">{formatDateTimeDisplay(date, time)}</span>
          <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <span className="text-slate-500 text-[11px] mt-0.5">{shift || '8am to 5pm'}</span>
        <span className="text-slate-700 font-medium text-[11px] truncate mt-0.5" title={inCharge}>
          {inCharge || 'Staff'}
        </span>
      </div>
    );
  };

  return (
    <div className="relative overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
      {/* Excel Sheet Style Header Ribbon */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Laundry Monitoring Sheet
          </span>
          <span className="text-slate-500 font-medium">
            Showing {records.length} batch{records.length === 1 ? '' : 'es'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Click any stage cell to update person in charge.
        </span>
      </div>

      <table className="w-full text-left text-xs text-slate-900 divide-y divide-slate-200">
        <thead className="bg-blue-600 text-white text-xs font-semibold sticky top-0 z-10 select-none">
          <tr className="divide-x divide-blue-500">
            {/* 1. Laundry IN (Date/ Shift/ In Charge) */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[160px]">
              <div className="font-bold">Laundry IN</div>
              <div className="text-[10px] text-blue-100 font-normal">(Date / Shift / In Charge)</div>
            </th>

            {/* 2. Items */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">
              <div className="font-bold">Items</div>
            </th>

            {/* 3. Quantity */}
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[70px]">
              <div className="font-bold">Qty</div>
            </th>

            {/* 4. Laba */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">
              <div className="font-bold">Laba</div>
              <div className="text-[10px] text-blue-100 font-normal">(Date / Shift / In Charge)</div>
            </th>

            {/* 5. Banlaw */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">
              <div className="font-bold">Banlaw</div>
              <div className="text-[10px] text-blue-100 font-normal">(Date / Shift / In Charge)</div>
            </th>

            {/* 6. Sampay */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">
              <div className="font-bold">Sampay</div>
              <div className="text-[10px] text-blue-100 font-normal">(Date / Shift / In Charge)</div>
            </th>

            {/* 7. Pinaw */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">
              <div className="font-bold">Pinaw</div>
              <div className="text-[10px] text-blue-100 font-normal">(Date / Shift / In Charge)</div>
            </th>

            {/* 8. Tiklop */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">
              <div className="font-bold">Tiklop</div>
              <div className="text-[10px] text-blue-100 font-normal">(Date / Shift / In Charge)</div>
            </th>

            {/* 9. Date Returned/ By */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[150px]">
              <div className="font-bold">Returned / By</div>
            </th>

            {/* 10. Encoded By */}
            <th className="px-3.5 py-3 whitespace-nowrap min-w-[110px]">
              <div className="font-bold">Encoded By</div>
            </th>

            {/* Status & Actions */}
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[100px]">
              <div className="font-semibold text-xs">Status</div>
            </th>
            <th className="px-3 py-3 whitespace-nowrap text-center min-w-[110px]">
              <div className="font-semibold text-xs">Actions</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {loading ? (
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="divide-x divide-slate-100 animate-pulse">
                <td className="p-2.5"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2.5"><div className="h-10 bg-slate-100 rounded-md" /></td>
                <td className="p-2.5"><div className="h-6 w-8 mx-auto bg-slate-100 rounded" /></td>
                <td className="p-2"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2.5"><div className="h-12 bg-slate-100 rounded-md" /></td>
                <td className="p-2.5"><div className="h-6 w-16 bg-slate-100 rounded" /></td>
                <td className="p-2.5 text-center"><div className="h-6 w-16 mx-auto bg-slate-100 rounded-full" /></td>
                <td className="p-2.5 text-center"><div className="h-8 w-16 mx-auto bg-slate-100 rounded-lg" /></td>
              </tr>
            ))
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                No laundry records found for current filters.
              </td>
            </tr>
          ) : (
            records.map((r) => {
              const statusMeta = LAUNDRY_STATUS_MAP[r.status] || {
                label: r.status,
                variant: 'neutral',
              };

              return (
                <tr key={r.id} className="divide-x divide-slate-200 hover:bg-slate-50 transition-colors">
                  {/* 1. Laundry IN (Date/ Shift/ In Charge) */}
                  <td className="p-2.5">
                    <div
                      onClick={() => onAdvanceStage && onAdvanceStage(r, 'in')}
                      className="group flex flex-col justify-center p-2 rounded-md bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 text-xs min-w-[140px] leading-tight cursor-pointer transition-colors shadow-2xs"
                      title="Click to edit intake details"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-900">{formatDateTimeDisplay(r.laundry_in_date, r.laundry_in_time)}</span>
                        <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <span className="text-slate-500 text-[11px] mt-0.5">{r.laundry_in_shift}</span>
                      <span className="text-slate-700 text-[11px] font-medium mt-0.5 truncate" title={r.laundry_in_charge}>
                        {r.laundry_in_charge}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>#{r.id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                          {r.location_details?.name || 'NO CODE'}
                        </span>
                      </span>
                    </div>
                  </td>

                  {/* 2. Items */}
                  <td className="p-2.5">
                    {(() => {
                      const hasItems = r.items && r.items.length > 0;
                      const displayItemStr = hasItems
                        ? r.items.map(i => i.item_description).join(' / ')
                        : r.item;
                      const hasNotes = hasItems ? r.items.some(i => i.notes) || r.notes : r.notes;

                      return (
                        <>
                          <div className="font-semibold text-slate-900 max-w-[160px] truncate" title={displayItemStr}>
                            {displayItemStr}
                          </div>
                          {hasItems && r.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItemBreakdownRecord(r)}
                              className="text-[10px] text-blue-600 hover:underline mt-0.5 flex items-center gap-1"
                            >
                              <List className="w-3 h-3" /> View Breakdown ({r.items.length})
                            </button>
                          )}
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {r.location_details?.name || 'NO CODE'}
                            </span>
                          </div>
                          {hasNotes && (
                            <p className="text-[11px] text-slate-500 truncate max-w-[160px] mt-1" title={r.notes}>
                              {r.notes}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </td>

                  {/* 3. Quantity */}
                  <td className="p-2.5 text-center font-bold text-slate-900 text-base">
                    {r.total_quantity || r.quantity}
                  </td>

                  {/* 4. Laba */}
                  <td className="p-2">
                    {renderProcessCell(r.laba_date, r.laba_time, r.laba_shift, r.laba_in_charge, 'Laba', 'laba', r)}
                  </td>

                  {/* 5. Banlaw */}
                  <td className="p-2">
                    {renderProcessCell(r.banlaw_date, r.banlaw_time, r.banlaw_shift, r.banlaw_in_charge, 'Banlaw', 'banlaw', r)}
                  </td>

                  {/* 6. Sampay */}
                  <td className="p-2">
                    {renderProcessCell(r.sampay_date, r.sampay_time, r.sampay_shift, r.sampay_in_charge, 'Sampay', 'sampay', r)}
                  </td>

                  {/* 7. Pinaw */}
                  <td className="p-2">
                    {renderProcessCell(r.pinaw_date, r.pinaw_time, r.pinaw_shift, r.pinaw_in_charge, 'Pinaw', 'pinaw', r)}
                  </td>

                  {/* 8. Tiklop */}
                  <td className="p-2">
                    {renderProcessCell(r.tiklop_date, r.tiklop_time, r.tiklop_shift, r.tiklop_in_charge, 'Tiklop', 'tiklop', r)}
                  </td>

                  {/* 9. Date Returned/ By */}
                  <td className="p-2.5">
                    {r.date_returned ? (
                      <div
                        onClick={() => onAdvanceStage && onAdvanceStage(r, 'return')}
                        className="group flex flex-col justify-center p-2 rounded-md bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 text-xs min-w-[130px] leading-tight cursor-pointer transition-colors shadow-2xs"
                        title="Click to edit returned date or delivery person"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-slate-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                            {formatDateTimeDisplay(r.date_returned, r.returned_time)}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <span className="text-slate-600 text-[11px] mt-0.5 truncate" title={r.returned_by}>
                          By: {r.returned_by}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-50 border border-dashed border-slate-200 text-xs min-h-[64px]">
                        <span className="text-slate-500 font-mono">—</span>
                        {onAdvanceStage && (
                          <button
                            type="button"
                            onClick={() => onAdvanceStage(r, 'return')}
                            className="mt-1 px-2 py-0.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                          >
                            + Return
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 10. Encoded By */}
                  <td className="p-2.5 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-medium">{r.encoded_by || 'Staff'}</div>
                  </td>

                  {/* Operational Status */}
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <Badge variant={statusMeta.variant} size="sm">
                      {statusMeta.label}
                    </Badge>
                  </td>

                  {/* Operational Actions */}
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewDetail && onViewDetail(r)}
                        icon={Eye}
                      >
                        Detail
                      </Button>
                      {isMasterAdmin && onDeleteRecord && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteRecord(r)}
                          icon={Trash2}
                          title="Delete laundry batch"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Item Breakdown Modal */}
      <Modal
        isOpen={!!itemBreakdownRecord}
        onClose={() => setItemBreakdownRecord(null)}
        title="Item Breakdown"
        subtitle={`Batch #${itemBreakdownRecord?.id} - ${itemBreakdownRecord?.location_details?.name || 'NO CODE'}`}
        maxWidth="max-w-md"
      >
        {itemBreakdownRecord && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm text-slate-600 divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-700">
                  <tr>
                    <th className="px-4 py-2">Item Description</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-left">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemBreakdownRecord.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{item.item_description}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-left text-slate-500">{item.unit || 'pcs'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-800">
                  <tr>
                    <td className="px-4 py-2.5 text-right uppercase text-xs">Total Quantity:</td>
                    <td className="px-4 py-2.5 text-right">
                      {itemBreakdownRecord.total_quantity || itemBreakdownRecord.quantity}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setItemBreakdownRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
