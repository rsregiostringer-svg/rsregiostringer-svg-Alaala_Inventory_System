import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import {
  Package,
  AlertTriangle,
  XCircle,
  Box,
  Shirt,
  Wrench,
  Receipt,
  Building2,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Droplet,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate, LAUNDRY_STATUS_MAP, MAINTENANCE_PRIORITY_MAP, PAYMENT_STATUS_MAP } from '../utils/formatters';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { pollTick, subscribe } = useRealtime();
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const res = await api.get('/dashboard/');
      setData(res);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard metrics from backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and fallback pollTick refresh
  useEffect(() => {
    fetchDashboardData(data !== null);
  }, [fetchDashboardData, pollTick]);

  // Subscribe to realtime stream events
  useEffect(() => {
    const unsub = subscribe('*', (type) => {
      // Re-fetch dashboard data when any relevant operational record updates
      if (
        type.startsWith('inventory.') ||
        type.startsWith('laundry.') ||
        type.startsWith('casket.') ||
        type.startsWith('maintenance.') ||
        type.startsWith('water.') ||
        type.startsWith('electricity.')
      ) {
        fetchDashboardData(true);
      }
    });

    return () => unsub();
  }, [subscribe, fetchDashboardData]);

  if (loading && !data) {
    return <LoadingState message="Loading live operational status..." />;
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/30 rounded-2xl max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-100">Dashboard Unavailable</h3>
        <p className="text-xs text-rose-300 mt-1 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => fetchDashboardData(false)}>
          Try Again
        </Button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const locations = data?.inventory_by_location || [];
  const lowStock = data?.low_stock_items || [];
  const outOfStock = data?.out_of_stock_items || [];
  const laundryBreakdown = data?.laundry_by_status || [];
  const maintenanceAlerts = data?.maintenance_alerts || [];
  const recentWater = data?.recent_water_bills || [];
  const recentElec = data?.recent_electricity_bills || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            Operational Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime inventory, laundry tracking, caskets, and facility status across all 7 locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            loading={refreshing}
            icon={RefreshCw}
          >
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Row 1: Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inventory Items */}
        <div
          onClick={() => navigate('/inventory')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Total Items</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{kpis.total_inventory_items || 0}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Available Qty:</span>
            <span className="font-semibold text-slate-200">{kpis.total_available_quantity || 0} units</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => navigate('/inventory?status=LOW_STOCK')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{kpis.low_stock_count || 0}</div>
          <div className="mt-1 text-[11px] text-amber-400/80">Require replenishment soon</div>
        </div>

        {/* Out of Stock Alerts */}
        <div
          onClick={() => navigate('/inventory?status=OUT_OF_STOCK')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">{kpis.out_of_stock_count || 0}</div>
          <div className="mt-1 text-[11px] text-rose-400/80">Zero available inventory</div>
        </div>

        {/* Available Caskets */}
        <div
          onClick={() => navigate('/caskets')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Caskets Available</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-400">{kpis.caskets_available || 0}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Reserved: {kpis.caskets_reserved || 0}</span>
            <span>Repair: {kpis.caskets_for_repair || 0}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Laundry in Process */}
        <div
          onClick={() => navigate('/laundry')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/40 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Laundry in Process</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-105 transition-transform">
              <Shirt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-400">{kpis.laundry_in_process || 0}</div>
          <div className="mt-1 text-[11px] text-slate-400">Batches currently undergoing washing & folding</div>
        </div>

        {/* Open Maintenance */}
        <div
          onClick={() => navigate('/maintenance')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Open Maintenance</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{kpis.open_maintenance || 0}</div>
          <div className="mt-1 text-[11px] text-amber-400/90">
            {kpis.urgent_maintenance || 0} Urgent / High priority tickets
          </div>
        </div>

        {/* Unpaid Utility Bills */}
        <div
          onClick={() => navigate('/water')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer group shadow-md col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Unpaid Bills</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {formatCurrency(kpis.unpaid_bills_amount || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {kpis.unpaid_bills_count || 0} bills pending (Water + Electricity)
          </div>
        </div>
      </div>

      {/* Row 3: Inventory By Location (7 Locations) */}
      <Card
        title="Inventory by Location"
        subtitle="Current stock levels and status breakdown across all 7 operational locations."
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} icon={ArrowRight}>
            View Inventory
          </Button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {locations.map((loc) => (
            <div
              key={loc.location_id}
              onClick={() => navigate(`/inventory?location=${loc.location_id}`)}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span title={loc.location_name}>{loc.location_name}</span>
              </div>
              <div className="mt-2 text-xl font-bold text-slate-100">{loc.total_quantity}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{loc.total_items} items</div>
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-amber-400 font-semibold">{loc.low_stock_count} low</span>
                <span className="text-rose-400 font-semibold">{loc.out_of_stock_count} out</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Row 4: Low Stock & Out of Stock Detail Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of Stock Alerts */}
        <Card
          title="Out of Stock Items"
          subtitle="Items with zero quantity requiring immediate attention."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory?status=OUT_OF_STOCK')} icon={ArrowRight}>
              Manage
            </Button>
          }
        >
          {outOfStock.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mb-1" />
              <span>No items are currently out of stock. Excellent!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {outOfStock.map((it) => (
                <div
                  key={it.id}
                  onClick={() => navigate(`/inventory?search=${encodeURIComponent(it.item_name)}`)}
                  className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{it.item_name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Location: {it.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger" size="sm">0 {it.unit}</Badge>
                    <p className="text-[10px] text-slate-500 mt-1">Min: {it.minimum_stock} {it.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low Stock Items */}
        <Card
          title="Low Stock Items"
          subtitle="Items approaching or below safety threshold."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory?status=LOW_STOCK')} icon={ArrowRight}>
              Manage
            </Button>
          }
        >
          {lowStock.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mb-1" />
              <span>All inventory stock levels are well above safety threshold.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map((it) => (
                <div
                  key={it.id}
                  onClick={() => navigate(`/inventory?search=${encodeURIComponent(it.item_name)}`)}
                  className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{it.item_name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Location: {it.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning" size="sm">
                      {it.current_quantity} {it.unit}
                    </Badge>
                    <p className="text-[10px] text-slate-500 mt-1">Min: {it.minimum_stock} {it.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 5: Laundry Status & Open Maintenance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Laundry Status Distribution */}
        <Card
          title="Laundry Status"
          subtitle="Batches currently distributed across workflow stages."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/laundry')} icon={ArrowRight}>
              Monitoring Sheet
            </Button>
          }
        >
          {laundryBreakdown.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No active laundry batches.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {laundryBreakdown.map((lb) => {
                const meta = LAUNDRY_STATUS_MAP[lb.status] || { label: lb.status, variant: 'neutral' };
                return (
                  <div
                    key={lb.status}
                    onClick={() => navigate(`/laundry?status=${lb.status}`)}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <div className="text-xs font-medium text-slate-300 truncate">{meta.label}</div>
                    <div className="mt-1 text-lg font-bold text-amber-400">{lb.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Maintenance Alerts */}
        <Card
          title="Maintenance Alerts"
          subtitle="Priority issues reported across chapels & facilities."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/maintenance')} icon={ArrowRight}>
              All Tickets
            </Button>
          }
        >
          {maintenanceAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mb-1" />
              <span>All chapel equipment & facilities are in operational condition.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {maintenanceAlerts.map((m) => {
                const pMeta = MAINTENANCE_PRIORITY_MAP[m.priority] || { label: m.priority, variant: 'neutral' };
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/maintenance?search=${m.maintenance_id}`)}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200">{m.issue}</span>
                        <Badge variant={pMeta.variant} size="sm">{pMeta.label}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {m.location} &bull; {m.category} &bull; Reported {formatDate(m.date_reported)}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-500 shrink-0">{m.maintenance_id}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Row 6: Utilities Summary (Water & Electricity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Water Bills */}
        <Card
          title="Water Bills"
          subtitle="Recent readings, consumption, and payment status."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/water')} icon={ArrowRight}>
              Manage Water
            </Button>
          }
        >
          {recentWater.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No water records found.</p>
          ) : (
            <div className="space-y-2">
              {recentWater.map((b) => {
                const sMeta = PAYMENT_STATUS_MAP[b.payment_status] || { label: b.payment_status, variant: 'neutral' };
                return (
                  <div
                    key={b.id}
                    onClick={() => navigate('/water')}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                        <Droplet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {b.location} &bull; {b.billing_period}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Consumption: {b.consumption} m³ &bull; Due: {formatDate(b.due_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-100">{formatCurrency(b.amount)}</div>
                      <div className="mt-1">
                        <Badge variant={sMeta.variant} size="sm">{sMeta.label}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Electricity Bills */}
        <Card
          title="Electricity Bills"
          subtitle="Recent power consumption and payment status."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/electricity')} icon={ArrowRight}>
              Manage Electricity
            </Button>
          }
        >
          {recentElec.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No electricity records found.</p>
          ) : (
            <div className="space-y-2">
              {recentElec.map((b) => {
                const sMeta = PAYMENT_STATUS_MAP[b.payment_status] || { label: b.payment_status, variant: 'neutral' };
                return (
                  <div
                    key={b.id}
                    onClick={() => navigate('/electricity')}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {b.location} &bull; {b.billing_period}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Consumption: {b.consumption} kWh &bull; Due: {formatDate(b.due_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-100">{formatCurrency(b.amount)}</div>
                      <div className="mt-1">
                        <Badge variant={sMeta.variant} size="sm">{sMeta.label}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
