import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Skeleton, StatSkeleton, CardSkeleton } from '../components/common/Skeleton';
import {
  Package,
  AlertTriangle,
  Box,
  Shirt,
  Wrench,
  Receipt,
  Building2,
  ArrowRight,
  RefreshCw,
  Droplet,
  Zap,
  CheckCircle2,
  Clock,
  Users,
  Eye,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatDateTimeDisplay,
  LAUNDRY_STATUS_MAP,
  MAINTENANCE_PRIORITY_MAP,
  PAYMENT_STATUS_MAP,
} from '../utils/formatters';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { isMasterAdmin } = useAuth();
  const { pollTick, subscribe } = useRealtime();
  const navigate = useNavigate();
  const [unauthorizedNotice, setUnauthorizedNotice] = useState('');

  // Check if redirected from a restricted route
  useEffect(() => {
    if (window.history.state?.usr?.error) {
      setUnauthorizedNotice(window.history.state.usr.error);
    }
  }, []);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const res = await api.get('/dashboard/');
      setData(res);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(data !== null);
  }, [fetchDashboardData, pollTick]);

  useEffect(() => {
    const unsub = subscribe('*', (type) => {
      if (
        type.startsWith('inventory.') ||
        type.startsWith('laundry.') ||
        type.startsWith('casket.') ||
        type.startsWith('chapel.') ||
        type.startsWith('lamay.') ||
        type.startsWith('maintenance.') ||
        type.startsWith('water.') ||
        type.startsWith('electricity.')
      ) {
        fetchDashboardData(true);
      }
    });

    return () => unsub();
  }, [subscribe, fetchDashboardData]);

  const kpis = data?.kpis || {};
  const currentLamayList = data?.current_lamay || [];
  const chapelsSummary = data?.chapels_summary || {};
  const [selectedLamay, setSelectedLamay] = useState(null);

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
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational overview of inventory, caskets, chapel services, and utilities.
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
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && !data && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchDashboardData(false)}>
            Retry
          </Button>
        </div>
      )}

      {/* Unauthorized Notice Banner */}
      {unauthorizedNotice && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <p className="text-sm font-medium text-amber-800">{unauthorizedNotice}</p>
          </div>
          <button
            onClick={() => setUnauthorizedNotice('')}
            className="text-xs text-amber-800 font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Row 1: Primary Clean White KPI Cards */}
      {loading && !data ? (
        <StatSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TOTAL INVENTORY */}
          <div
            onClick={() => navigate('/inventory')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Inventory</span>
              <Package className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {kpis.total_inventory_items || 0}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Qty: <strong className="text-slate-800">{kpis.total_available_quantity || 0}</strong></span>
              {kpis.low_stock_count > 0 && (
                <span className="text-amber-700 font-medium">Low: {kpis.low_stock_count}</span>
              )}
              {kpis.out_of_stock_count > 0 && (
                <span className="text-red-700 font-medium">Out: {kpis.out_of_stock_count}</span>
              )}
            </div>
          </div>

          {/* AVAILABLE CASKETS */}
          <div
            onClick={() => navigate('/caskets')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Caskets</span>
              <Box className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {kpis.caskets_available || 0}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Reserved: <strong className="text-amber-700">{kpis.caskets_reserved || 0}</strong></span>
              <span>Sold/Used: <strong className="text-slate-700">{kpis.caskets_sold_used || 0}</strong></span>
            </div>
          </div>

          {/* CURRENT LAMAY */}
          <div
            onClick={() => navigate('/chapels')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                {currentLamayList.length > 0 && <span className="w-2 h-2 rounded-full bg-red-600" />}
                Current Lamay
              </span>
              <Building2 className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {kpis.current_lamay_count ?? currentLamayList.length}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>Status:</span>
              <strong className={currentLamayList.length > 0 ? 'text-red-600' : 'text-slate-600'}>
                {currentLamayList.length > 0 ? `${currentLamayList.length} In Service` : 'None Active'}
              </strong>
            </div>
          </div>

          {/* AVAILABLE CHAPELS */}
          <div
            onClick={() => navigate('/chapels')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Chapels</span>
              <Building2 className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {kpis.chapels_available ?? chapelsSummary.available ?? 0}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Occupied: <strong className="text-red-600">{kpis.chapels_occupied ?? chapelsSummary.occupied ?? 0}</strong></span>
              <span>Cleaning: <strong className="text-slate-700">{kpis.chapels_cleaning ?? chapelsSummary.cleaning ?? 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* CURRENT LAMAY MONITORING */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Current Lamay</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {currentLamayList.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ongoing wake and viewing services across chapels.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/chapels')}
            icon={ArrowRight}
          >
            View Chapels
          </Button>
        </div>

        {currentLamayList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-7 h-7 mx-auto text-blue-600 mb-2 opacity-90" />
            <p className="font-semibold text-slate-800 text-sm">Walang lamay sa ngayon.</p>
            <p className="text-slate-500 mt-0.5">All chapels are currently available or undergoing cleaning.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {currentLamayList.map((lamay) => (
              <div
                key={lamay.id}
                onClick={() => setSelectedLamay(lamay)}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                      {lamay.chapel_name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDate(lamay.lamay_start_date)}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mt-2 truncate">
                    {lamay.deceased_name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buyer:</span>
                      <span className="font-medium text-slate-800 truncate">{lamay.buyer_name}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Expected Burial:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatDateTimeDisplay(lamay.expected_burial_date, lamay.burial_time)}
                      </span>
                    </div>

                    {lamay.casket_info && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Casket:</span>
                        <span className="text-slate-700 truncate font-mono text-xs">{lamay.casket_info}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
                  <span>View Details</span>
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: Secondary Clean KPI Cards */}
      {loading && !data ? (
        <StatSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Laundry in Process */}
          <div
            onClick={() => navigate('/laundry')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Laundry in Process</span>
              <Shirt className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.laundry_in_process || 0}</div>
            <div className="mt-1 text-xs text-slate-500">Batches currently in washing or folding</div>
          </div>

          {/* Open Maintenance */}
          <div
            onClick={() => navigate('/maintenance')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Open Maintenance</span>
              <Wrench className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.open_maintenance || 0}</div>
            <div className="mt-1 text-xs text-slate-500">
              {kpis.urgent_maintenance > 0 ? (
                <span className="text-red-600 font-medium">{kpis.urgent_maintenance} Urgent priority tickets</span>
              ) : (
                'All tickets normal priority'
              )}
            </div>
          </div>

          {/* Unpaid Utility Bills */}
          <div
            onClick={() => navigate('/water')}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Bills</span>
              <Receipt className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(kpis.unpaid_bills_amount || 0)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {kpis.unpaid_bills_count || 0} pending bills (Water & Electricity)
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Inventory By Location */}
      <Card
        title="Inventory by Location"
        subtitle="Stock breakdown across chapels, office, and service areas."
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} icon={ArrowRight}>
            View Inventory
          </Button>
        }
      >
        {loading && !data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {locations.map((loc) => {
              const isChapel = ['C2', 'C3', 'NC2', 'NC3'].includes(loc.location_name);
              const isOffice = loc.location_name === 'OFFICE';
              const isServices = loc.location_name === 'SERVICES';

              let badgeText = 'Chapel';
              if (isOffice) badgeText = 'Office';
              else if (isServices) badgeText = 'Services';
              else if (!isChapel) badgeText = 'Location';

              return (
                <div
                  key={loc.location_id}
                  onClick={() => navigate(`/inventory?location=${loc.location_id}`)}
                  className="p-3 rounded-lg bg-white border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span title={loc.location_name}>{loc.location_name}</span>
                    </div>
                    <div className="mt-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                        {badgeText}
                      </span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-900">{loc.total_quantity}</div>
                    <div className="text-[11px] text-slate-500">{loc.total_items} items</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-amber-700 font-medium">{loc.low_stock_count} low</span>
                    <span className="text-red-700 font-medium">{loc.out_of_stock_count} out</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Row 4: Low Stock & Out of Stock Detail Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of Stock Alerts */}
        <Card
          title="Out of Stock Items"
          subtitle="Items with zero quantity requiring restocking."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory?status=OUT_OF_STOCK')} icon={ArrowRight}>
              Manage
            </Button>
          }
        >
          {loading && !data ? (
            <CardSkeleton rows={3} />
          ) : outOfStock.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-blue-600 mb-1" />
              <span>No items are currently out of stock.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {outOfStock.map((it) => (
                <div
                  key={it.id}
                  onClick={() => navigate(`/inventory?search=${encodeURIComponent(it.item_name)}`)}
                  className="p-3 rounded-lg bg-red-50/50 border border-red-200 flex items-center justify-between hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{it.item_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Location: {it.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="red" size="sm">0 {it.unit}</Badge>
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
          {loading && !data ? (
            <CardSkeleton rows={3} />
          ) : lowStock.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-blue-600 mb-1" />
              <span>All inventory stock levels are normal.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map((it) => (
                <div
                  key={it.id}
                  onClick={() => navigate(`/inventory?search=${encodeURIComponent(it.item_name)}`)}
                  className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 flex items-center justify-between hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{it.item_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Location: {it.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="yellow" size="sm">
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
          subtitle="Batches across workflow stages."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/laundry')} icon={ArrowRight}>
              Monitoring Table
            </Button>
          }
        >
          {loading && !data ? (
            <CardSkeleton rows={3} />
          ) : laundryBreakdown.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No active laundry batches.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {laundryBreakdown.map((lb) => {
                const meta = LAUNDRY_STATUS_MAP[lb.status] || { label: lb.status, variant: 'neutral' };
                return (
                  <div
                    key={lb.status}
                    onClick={() => navigate(`/laundry?status=${lb.status}`)}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-medium text-slate-700 truncate">{meta.label}</div>
                    <div className="mt-1 text-lg font-bold text-blue-600">{lb.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Maintenance Alerts */}
        <Card
          title="Maintenance Alerts"
          subtitle="Reported facility & equipment issues."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/maintenance')} icon={ArrowRight}>
              All Tickets
            </Button>
          }
        >
          {loading && !data ? (
            <CardSkeleton rows={3} />
          ) : maintenanceAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-blue-600 mb-1" />
              <span>All chapel equipment and facilities are in working condition.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {maintenanceAlerts.map((m) => {
                const pMeta = MAINTENANCE_PRIORITY_MAP[m.priority] || { label: m.priority, variant: 'neutral' };
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/maintenance?search=${m.maintenance_id}`)}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{m.issue}</span>
                        <Badge variant={pMeta.variant} size="sm">{pMeta.label}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
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
          subtitle="Recent readings and payment status."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/water')} icon={ArrowRight}>
              Manage Water
            </Button>
          }
        >
          {loading && !data ? (
            <CardSkeleton rows={3} />
          ) : recentWater.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No water records found.</p>
          ) : (
            <div className="space-y-2">
              {recentWater.map((b) => {
                const sMeta = PAYMENT_STATUS_MAP[b.payment_status] || { label: b.payment_status, variant: 'neutral' };
                return (
                  <div
                    key={b.id}
                    onClick={() => navigate('/water')}
                    className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Droplet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {b.location} &bull; {b.billing_period}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Consumption: {b.consumption} m³ &bull; Due: {formatDate(b.due_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{formatCurrency(b.amount)}</div>
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
          subtitle="Recent power bills and payment status."
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/electricity')} icon={ArrowRight}>
              Manage Electricity
            </Button>
          }
        >
          {loading && !data ? (
            <CardSkeleton rows={3} />
          ) : recentElec.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No electricity records found.</p>
          ) : (
            <div className="space-y-2">
              {recentElec.map((b) => {
                const sMeta = PAYMENT_STATUS_MAP[b.payment_status] || { label: b.payment_status, variant: 'neutral' };
                return (
                  <div
                    key={b.id}
                    onClick={() => navigate('/electricity')}
                    className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {b.location} &bull; {b.billing_period}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Consumption: {b.consumption} kWh &bull; Due: {formatDate(b.due_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{formatCurrency(b.amount)}</div>
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

      {/* Service Details Modal */}
      <Modal
        isOpen={!!selectedLamay}
        onClose={() => setSelectedLamay(null)}
        title={selectedLamay ? `Service Details: ${selectedLamay.chapel_name}` : 'Service Details'}
        maxWidth="max-w-2xl"
      >
        {selectedLamay && (
          <div className="space-y-5 text-sm">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="font-bold text-slate-900">{selectedLamay.chapel_name}</span>
                <span className="text-xs text-slate-500 font-mono">({selectedLamay.lamay_id})</span>
              </div>
              <Badge variant="blue" size="sm">
                {selectedLamay.status_display || selectedLamay.status}
              </Badge>
            </div>

            {/* Deceased & Buyer Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Deceased Info */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Deceased Information
                </div>
                <div className="text-base font-bold text-slate-900">
                  {selectedLamay.deceased_name}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {selectedLamay.deceased_age && <div>Age: <strong>{selectedLamay.deceased_age} yrs old</strong> ({selectedLamay.deceased_sex || 'N/A'})</div>}
                  {selectedLamay.deceased_date_of_death && <div>Date of Death: <strong>{formatDate(selectedLamay.deceased_date_of_death)}</strong></div>}
                  {selectedLamay.funeral_case_id && <div>Funeral Case ID: <strong className="font-mono">{selectedLamay.funeral_case_id}</strong></div>}
                </div>
              </div>

              {/* Buyer / Family Contact Info */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Buyer / Family Contact
                </div>
                <div className="text-base font-bold text-slate-900">
                  {selectedLamay.buyer_name}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Contact: <strong className="font-mono">{selectedLamay.buyer_contact || 'N/A'}</strong></div>
                  {selectedLamay.buyer_relationship && <div>Relationship: <strong>{selectedLamay.buyer_relationship}</strong></div>}
                  {selectedLamay.buyer_address && <div>Address: <span>{selectedLamay.buyer_address}</span></div>}
                </div>
              </div>
            </div>

            {/* Service & Schedule Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Lamay Schedule
                </div>
                <div className="text-xs text-slate-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Start Date/Time:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatDate(selectedLamay.lamay_start_date)} {selectedLamay.lamay_start_time || ''}
                    </strong>
                  </div>
                  {selectedLamay.expected_end_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expected End:</span>
                      <strong className="text-slate-800 font-mono">{formatDate(selectedLamay.expected_end_date)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="text-slate-700 font-semibold">Expected Burial:</span>
                    <strong className="text-slate-900 font-mono font-bold">
                      {formatDateTimeDisplay(selectedLamay.expected_burial_date, selectedLamay.burial_time)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Casket & Assignment Info */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Box className="w-4 h-4 text-blue-600" />
                  Casket & Details
                </div>
                <div className="text-xs text-slate-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Casket Used:</span>
                    <strong className="text-slate-900 font-mono">{selectedLamay.casket_info}</strong>
                  </div>
                  {selectedLamay.encoded_by && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Encoded By:</span>
                      <span className="text-slate-800">{selectedLamay.encoded_by}</span>
                    </div>
                  )}
                  {selectedLamay.notes && (
                    <div className="pt-1 text-[11px] text-slate-500 italic">
                      Notes: {selectedLamay.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLamay(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedLamay(null);
                  navigate('/chapels');
                }}
                icon={Building2}
              >
                Go to Chapel Monitoring
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
