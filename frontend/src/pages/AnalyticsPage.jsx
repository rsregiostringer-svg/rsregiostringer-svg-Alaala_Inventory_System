import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { Skeleton, CardSkeleton } from '../components/common/Skeleton';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  Package,
  Shirt,
  Box,
  Wrench,
  Droplet,
  Zap,
  Building2,
  Users,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Layers,
  ArrowLeftRight
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalytics = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const res = await api.get('/analytics/');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load executive analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const inv = data?.inventory || {};
  const laundry = data?.laundry || {};
  const caskets = data?.caskets || {};
  const maint = data?.maintenance || {};
  const util = data?.utilities || {};
  const locations = data?.locations || [];
  const employees = data?.employees || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
                Executive Analytics & Intelligence
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidated cross-facility performance, operations metrics, stock movement, and financial utility costs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            Master Admin Executive Access
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchAnalytics(true)}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs text-rose-300">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchAnalytics(false)}>
            Retry
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-px">
        {[
          { id: 'overview', label: 'Overview & Locations', icon: Building2 },
          { id: 'inventory', label: 'Inventory & Movement', icon: Package },
          { id: 'laundry', label: 'Laundry Stages', icon: Shirt },
          { id: 'caskets', label: 'Caskets & Showroom', icon: Box },
          { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench },
          { id: 'utilities', label: 'Water & Electricity', icon: Zap },
          { id: 'personnel', label: 'Personnel & Shifts', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-amber-400 text-amber-400 bg-slate-900/80 shadow-xs'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary High-Level Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-semibold">Inventory Value</span>
                    <Package className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-100">{formatCurrency(inv.valuation || 0)}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {inv.total_items || 0} unique items &bull; {inv.total_quantity || 0} units
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-semibold">Active Laundry</span>
                    <Shirt className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-sky-400">{laundry.in_process || 0} batches</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {laundry.returned || 0} completed & returned
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-semibold">Available Caskets</span>
                    <Box className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{caskets.available || 0} units</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {caskets.reserved || 0} reserved &bull; {caskets.sold || 0} sold
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-semibold">Utility Expenses</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-100">
                    {formatCurrency((util.water?.expenses || 0) + (util.electricity?.expenses || 0))}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Water + Electricity across all chapels
                  </div>
                </div>
              </div>

              {/* Location Consolidated Matrix Table */}
              <Card
                title="Cross-Facility Consolidated Performance"
                subtitle="Aggregated operations, asset volumes, and maintenance tickets across all active locations"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                        <th className="py-3 px-4 font-semibold">Location</th>
                        <th className="py-3 px-4 font-semibold">Inventory Items</th>
                        <th className="py-3 px-4 font-semibold">Available Stock</th>
                        <th className="py-3 px-4 font-semibold">Laundry Batches</th>
                        <th className="py-3 px-4 font-semibold">Caskets</th>
                        <th className="py-3 px-4 font-semibold">Open Maintenance</th>
                        <th className="py-3 px-4 font-semibold">Total Utility Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {locations.map((loc) => (
                        <tr key={loc.location_id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-200 flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            {loc.location_name}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{loc.inventory_items} items</td>
                          <td className="py-3 px-4 font-medium text-slate-100">{loc.inventory_qty} units</td>
                          <td className="py-3 px-4 text-sky-400 font-medium">{loc.laundry_count}</td>
                          <td className="py-3 px-4 text-emerald-400 font-medium">{loc.caskets_count}</td>
                          <td className="py-3 px-4">
                            {loc.open_maintenance > 0 ? (
                              <Badge variant="warning" size="sm">{loc.open_maintenance} Open</Badge>
                            ) : (
                              <Badge variant="success" size="sm">Optimal</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-100">
                            {formatCurrency(loc.total_utility_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB: INVENTORY & MOVEMENT */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Stock Units</span>
                  <div className="text-xl font-bold text-slate-100 mt-1">{inv.total_quantity || 0}</div>
                  <span className="text-[11px] text-slate-400">{inv.total_items} distinct catalogue SKUs</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Low Stock Items</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">{inv.low_stock || 0}</div>
                  <span className="text-[11px] text-slate-400">Below minimum threshold</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Out of Stock</span>
                  <div className="text-xl font-bold text-rose-400 mt-1">{inv.out_of_stock || 0}</div>
                  <span className="text-[11px] text-slate-400">Immediate order needed</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Valuation</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(inv.valuation || 0)}</div>
                  <span className="text-[11px] text-slate-400">Calculated unit purchase cost</span>
                </div>
              </div>

              <Card
                title="Stock Movement & Inventory Lifecycle Analytics"
                subtitle="Audit trail of receipts, issues, inter-branch transfers, damages, and operational consumption"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Stock IN
                    </span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{inv.movement?.stock_in || 0}</div>
                    <span className="text-[10px] text-slate-500">Intake / Purchases</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Stock OUT
                    </span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{inv.movement?.stock_out || 0}</div>
                    <span className="text-[10px] text-slate-500">Dispatched / Used</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Transfers
                    </span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{inv.movement?.transfers || 0}</div>
                    <span className="text-[10px] text-slate-500">Branch to Branch</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> Consumed
                    </span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{inv.movement?.consumed || 0}</div>
                    <span className="text-[10px] text-slate-500">Service usage</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Damaged
                    </span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{inv.movement?.damaged || 0}</div>
                    <span className="text-[10px] text-slate-500">Written off</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Lost / Scrap
                    </span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{inv.movement?.lost || 0}</div>
                    <span className="text-[10px] text-slate-500">Discrepancies</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB: LAUNDRY STAGES */}
          {activeTab === 'laundry' && (
            <div className="space-y-6">
              <Card
                title="Complete Laundry Stage Progression Funnel"
                subtitle="Stage-by-stage accountability tracking from laundry arrival to chapel delivery"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { key: 'laundry_in', label: 'Laundry IN', count: laundry.stages?.laundry_in, color: 'text-sky-400' },
                    { key: 'laba', label: 'Laba (Washing)', count: laundry.stages?.laba, color: 'text-indigo-400' },
                    { key: 'banlaw', label: 'Banlaw (Rinse)', count: laundry.stages?.banlaw, color: 'text-blue-400' },
                    { key: 'sampay', label: 'Sampay (Hanging)', count: laundry.stages?.sampay, color: 'text-teal-400' },
                    { key: 'pinaw', label: 'Pinaw (Drying)', count: laundry.stages?.pinaw, color: 'text-amber-400' },
                    { key: 'tiklop', label: 'Tiklop (Folding)', count: laundry.stages?.tiklop, color: 'text-orange-400' },
                    { key: 'returned', label: 'Returned', count: laundry.stages?.returned, color: 'text-emerald-400' },
                  ].map((stg) => (
                    <div key={stg.key} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                      <div className={`text-xs uppercase font-bold ${stg.color}`}>{stg.label}</div>
                      <div className="text-2xl font-bold text-slate-100 mt-1.5">{stg.count || 0}</div>
                      <span className="text-[10px] text-slate-500">records passed</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Laundry Shifts & Locations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Laundry Operations by Shift" subtitle="Distribution across working operational shifts">
                  <div className="space-y-3">
                    {laundry.by_shift?.map((sh, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-slate-200">{sh.laundry_in_shift || 'Standard Shift'}</span>
                        </div>
                        <Badge variant="primary" size="sm">{sh.count} Batches</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Laundry Volume by Chapel Location" subtitle="Total linen & textile intake per branch">
                  <div className="space-y-3">
                    {laundry.by_location?.map((loc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-sky-400" />
                          <span className="text-xs font-semibold text-slate-200">{loc.location__name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-100">{loc.total_qty || 0} pcs ({loc.count} batches)</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: CASKETS */}
          {activeTab === 'caskets' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Caskets</span>
                  <div className="text-xl font-bold text-slate-100 mt-1">{caskets.total || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Available</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{caskets.available || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-sky-400 uppercase font-semibold">Reserved</span>
                  <div className="text-xl font-bold text-sky-400 mt-1">{caskets.reserved || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-indigo-400 uppercase font-semibold">Sold</span>
                  <div className="text-xl font-bold text-indigo-400 mt-1">{caskets.sold || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold">For Repair</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">{caskets.for_repair || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Out of Stock</span>
                  <div className="text-xl font-bold text-rose-400 mt-1">{caskets.out_of_stock || 0}</div>
                </div>
              </div>

              <Card title="Casket Showroom Distribution by Category / Material">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caskets.by_type?.map((t, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{t.casket_type}</span>
                      <Badge variant="neutral" size="sm">{t.count} Units</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Open Tickets</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">{maint.open || 0}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Urgent Incidents</span>
                  <div className="text-xl font-bold text-rose-400 mt-1">{maint.urgent || 0}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Completed Works</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{maint.completed || 0}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Repair Cost</span>
                  <div className="text-xl font-bold text-slate-100 mt-1">{formatCurrency(maint.total_cost || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Maintenance Costs by Location">
                  <div className="space-y-3">
                    {maint.by_location?.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <span className="text-xs font-semibold text-slate-200">{m.location__name}</span>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-100">{formatCurrency(m.cost || 0)}</div>
                          <span className="text-[10px] text-slate-400">{m.count} tickets</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Issues by Category">
                  <div className="space-y-3">
                    {maint.by_category?.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <span className="text-xs font-semibold text-slate-200">{c.category}</span>
                        <Badge variant="primary" size="sm">{c.count} Requests</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: UTILITIES */}
          {activeTab === 'utilities' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Water Card */}
                <Card title="Water Consumption & Billing Analytics" subtitle="Metrics across provider accounts and meters">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Total Consumption</span>
                        <div className="text-lg font-bold text-sky-400 mt-1">{util.water?.consumption || 0} m³</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Total Billed</span>
                        <div className="text-lg font-bold text-slate-100 mt-1">{formatCurrency(util.water?.expenses || 0)}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Unpaid / Overdue Balance:</span>
                      <span className="font-bold text-rose-400">{formatCurrency(util.water?.unpaid || 0)}</span>
                    </div>
                  </div>
                </Card>

                {/* Electricity Card */}
                <Card title="Electricity Consumption & Billing Analytics" subtitle="Kilowatt-hour usage and payment balances">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Total Consumption</span>
                        <div className="text-lg font-bold text-amber-400 mt-1">{util.electricity?.consumption || 0} kWh</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Total Billed</span>
                        <div className="text-lg font-bold text-slate-100 mt-1">{formatCurrency(util.electricity?.expenses || 0)}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Unpaid / Overdue Balance:</span>
                      <span className="font-bold text-rose-400">{formatCurrency(util.electricity?.unpaid || 0)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: PERSONNEL */}
          {activeTab === 'personnel' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Personnel in Laundry Workflows" subtitle="Volume of laundry records logged and encoded">
                  <div className="space-y-2.5">
                    {employees.laundry_handled?.map((emp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <span className="text-xs font-semibold text-slate-200">{emp.encoded_by}</span>
                        <span className="text-xs font-bold text-amber-400">{emp.total_qty || 0} items ({emp.count} batches)</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Inventory Management Activity by User" subtitle="Transactions posted across all facilities">
                  <div className="space-y-2.5">
                    {employees.inventory_transactions?.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <div>
                          <span className="text-xs font-semibold text-slate-200">
                            {tx.user__first_name ? `${tx.user__first_name} ${tx.user__last_name || ''}` : tx.user__username}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono">@{tx.user__username}</span>
                        </div>
                        <Badge variant="primary" size="sm">{tx.count} Transactions</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
