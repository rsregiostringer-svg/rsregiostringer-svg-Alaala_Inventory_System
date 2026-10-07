import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import { StatSkeleton, CardSkeleton } from '../components/common/Skeleton';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Download,
  Printer,
  FileSpreadsheet,
  Filter,
  BarChart2,
  Package,
  Shirt,
  Box,
  Wrench,
  Droplet,
  Zap,
  Building2,
  Heart
} from 'lucide-react';

const MODULES = [
  { value: 'inventory', label: 'General Inventory', icon: Package },
  { value: 'transactions', label: 'Inventory Transactions', icon: BarChart2 },
  { value: 'laundry', label: 'Laundry Monitoring Records', icon: Shirt },
  { value: 'caskets', label: 'Casket Stock & History', icon: Box },
  { value: 'casket_sales', label: 'Casket Sales Report', icon: Box },
  { value: 'lamay', label: 'Lamay / Wake Service Report', icon: Heart },
  { value: 'chapel_occupancy', label: 'Chapel Occupancy Report', icon: Building2 },
  { value: 'maintenance', label: 'Facility Maintenance', icon: Wrench },
  { value: 'water', label: 'Water Utility Expenses', icon: Droplet },
  { value: 'electricity', label: 'Electricity Utility Expenses', icon: Zap },
];

export default function ReportsPage() {
  const [selectedModule, setSelectedModule] = useState('inventory');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, locRes] = await Promise.all([
        api.get('/reports/summary/', {
          location: selectedLocation,
          start_date: startDate,
          end_date: endDate,
        }),
        api.get('/locations/'),
      ]);
      setSummaryData(sumRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, startDate, endDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      module: selectedModule,
      location: selectedLocation || '',
      start_date: startDate || '',
      end_date: endDate || '',
    });

    const exportUrl = `${api.baseUrl}/reports/export-csv/?${params.toString()}`;
    const token = localStorage.getItem('alaala_access_token');

    // Trigger authenticated or standard download
    fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alaala_${selectedModule}_report.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Failed to download CSV: ' + err.message));
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams({
      module: selectedModule,
      location: selectedLocation || '',
      start_date: startDate || '',
      end_date: endDate || '',
    });

    const exportUrl = `${api.baseUrl}/reports/export-excel/?${params.toString()}`;
    const token = localStorage.getItem('alaala_access_token');

    fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alaala_${selectedModule}_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Failed to download Excel: ' + err.message));
  };

  const handlePrint = () => {
    window.print();
  };

  const inv = summaryData?.inventory || {};
  const laundry = summaryData?.laundry || {};
  const caskets = summaryData?.caskets || {};
  const chapels = summaryData?.chapels || {};
  const maint = summaryData?.maintenance || {};
  const util = summaryData?.utilities || {};

  const showCSV = selectedModule !== 'chapel_occupancy' && selectedModule !== 'lamay';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
            Operational Reports & Export
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate printable executive summaries and download exports for accounting & records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint} icon={Printer}>
            Print
          </Button>
          {showCSV && (
            <Button variant="secondary" size="sm" onClick={handleExportCSV} icon={Download}>
              CSV
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleExportExcel} icon={FileSpreadsheet}>
            Excel
          </Button>
        </div>
      </div>

      {/* Filter and Module Selection Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3 no-print">
        <div className="w-56">
          <Select
            label="Report Module"
            options={MODULES}
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select
            label="Location"
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="All Locations"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          />
        </div>

        <div className="w-40">
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="w-40">
          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {(selectedLocation || startDate || endDate) && (
          <div className="pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLocation('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Printable Report Header */}
      <div className="hidden print-only mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-bold">ALAALA FUNERAL HOMES</h1>
        <p className="text-sm text-gray-600">Executive Management & Inventory Status Report</p>
        <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <StatSkeleton count={4} />
          <CardSkeleton rows={5} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-medium">Inventory Valuation</span>
              <div className="mt-1 text-2xl font-bold text-blue-500">{formatCurrency(inv.valuation || 0)}</div>
              <div className="mt-1 text-[11px] text-slate-500">{inv.total_quantity || 0} total units in stock</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-medium">Caskets Available</span>
              <div className="mt-1 text-2xl font-bold text-indigo-400">{caskets.available || 0}</div>
              <div className="mt-1 text-[11px] text-slate-500">{caskets.reserved || 0} reserved &bull; {caskets.sold || 0} sold</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-medium">Chapels & Lamay</span>
              <div className="mt-1 text-2xl font-bold text-rose-400">{chapels.active_lamay || 0} <span className="text-xs font-normal text-slate-500">Active</span></div>
              <div className="mt-1 text-[11px] text-slate-500">{chapels.occupied || 0} occupied &bull; {chapels.available || 0} available</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-medium">Laundry In-Process</span>
              <div className="mt-1 text-2xl font-bold text-sky-400">{laundry.in_process || 0} batches</div>
              <div className="mt-1 text-[11px] text-slate-500">{laundry.returned || 0} returned</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-medium">Total Utility Cost</span>
              <div className="mt-1 text-2xl font-bold text-rose-400">{formatCurrency(util.total_utility_cost || 0)}</div>
              <div className="mt-1 text-[11px] text-rose-400/90">{formatCurrency(util.total_unpaid || 0)} unpaid</div>
            </div>
          </div>

          {/* Module Deep-Dive Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory & Safety Stock Analysis */}
            <Card title="Inventory & Stock Health">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Unique Inventory Items</span>
                  <span className="font-semibold text-slate-900">{inv.total_items} items</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Quantity in Hand</span>
                  <span className="font-semibold text-slate-900">{inv.total_quantity} units</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Estimated Inventory Value</span>
                  <span className="font-bold text-blue-500">{formatCurrency(inv.valuation)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Low Stock Warnings</span>
                  <span className="font-semibold text-blue-500">{inv.low_stock} items</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Out of Stock Warnings</span>
                  <span className="font-semibold text-rose-400">{inv.out_of_stock} items</span>
                </div>
              </div>
            </Card>

            {/* Laundry & Linen Operations */}
            <Card title="Laundry Operations Summary">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Laundry Batches Processed</span>
                  <span className="font-semibold text-slate-900">{laundry.total} batches</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Currently in Washing / Drying / Folding</span>
                  <span className="font-semibold text-sky-400">{laundry.in_process} active</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Completed & Returned to Chapels</span>
                  <span className="font-semibold text-emerald-400">{laundry.returned} batches</span>
                </div>
              </div>
            </Card>

            {/* Facility Maintenance Analysis */}
            <Card title="Facility Maintenance & Repairs">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Maintenance Tickets</span>
                  <span className="font-semibold text-slate-900">{maint.total_tickets} tickets</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Open / Ongoing Issues</span>
                  <span className="font-semibold text-blue-500">{maint.open_tickets} tickets</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Completed Work Orders</span>
                  <span className="font-semibold text-emerald-400">{maint.completed_tickets} resolved</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Cumulative Repair Costs</span>
                  <span className="font-bold text-slate-900">{formatCurrency(maint.total_cost)}</span>
                </div>
              </div>
            </Card>

            {/* Utility Expenses */}
            <Card title="Utility Consumption & Unpaid Bills">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Water Consumption</span>
                  <span className="font-semibold text-sky-400">{util.water_consumption?.toFixed(1)} m³ ({formatCurrency(util.water_amount)})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Electricity Consumption</span>
                  <span className="font-semibold text-blue-500">{util.electricity_consumption?.toFixed(1)} kWh ({formatCurrency(util.electricity_amount)})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Unpaid Water Bills</span>
                  <span className="font-semibold text-rose-400">{formatCurrency(util.water_unpaid)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Unpaid Electricity Bills</span>
                  <span className="font-semibold text-rose-400">{formatCurrency(util.electricity_unpaid)}</span>
                </div>
              </div>
            </Card>

            {/* Casket Inventory & Sales Performance */}
            <Card title="Casket Inventory & Sales Performance">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Available Caskets</span>
                  <span className="font-semibold text-indigo-400">{caskets.available || 0} units</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Reserved for Pending Services</span>
                  <span className="font-semibold text-sky-400">{caskets.reserved || 0} units</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Caskets For Repair</span>
                  <span className="font-semibold text-rose-400">{caskets.for_repair || 0} units</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Caskets Sold</span>
                  <span className="font-semibold text-emerald-400">{caskets.sold || 0} units</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Total Sales Revenue</span>
                  <span className="font-bold text-slate-900">{formatCurrency(caskets.revenue || 0)}</span>
                </div>
              </div>
            </Card>

            {/* Chapel & Lamay Wake Operations */}
            <Card title="Chapel & Lamay Wake Operations">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Configured Chapels</span>
                  <span className="font-semibold text-slate-900">{chapels.total || 0} chapels</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Currently Occupied / Active Lamay</span>
                  <span className="font-semibold text-rose-400">{chapels.occupied || 0} chapels</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Currently Available Chapels</span>
                  <span className="font-semibold text-sky-400">{chapels.available || 0} chapels</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Cleaning & Turnover in Progress</span>
                  <span className="font-semibold text-blue-500">{chapels.cleaning || 0} chapels</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Active Wake Services Ongoing</span>
                  <span className="font-bold text-rose-300">{chapels.active_lamay || 0} services</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
