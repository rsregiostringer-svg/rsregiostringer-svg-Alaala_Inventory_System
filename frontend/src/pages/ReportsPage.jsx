import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import Input from '../components/common/Input';
import LoadingState from '../components/common/LoadingState';
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
  Zap
} from 'lucide-react';

const MODULES = [
  { value: 'inventory', label: 'General Inventory', icon: Package },
  { value: 'transactions', label: 'Inventory Transactions', icon: BarChart2 },
  { value: 'laundry', label: 'Laundry Monitoring Records', icon: Shirt },
  { value: 'caskets', label: 'Casket Stock & History', icon: Box },
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

  const handlePrint = () => {
    window.print();
  };

  const inv = summaryData?.inventory || {};
  const laundry = summaryData?.laundry || {};
  const caskets = summaryData?.caskets || {};
  const maint = summaryData?.maintenance || {};
  const util = summaryData?.utilities || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            Operational Reports & Export
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate printable executive summaries and download CSV exports for accounting & records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint} icon={Printer}>
            Print Report
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportCSV} icon={Download}>
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Filter and Module Selection Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3 no-print">
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
        <LoadingState message="Generating report data..." />
      ) : (
        <div className="space-y-6">
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Inventory Valuation</span>
              <div className="mt-1 text-2xl font-bold text-amber-400">{formatCurrency(inv.valuation || 0)}</div>
              <div className="mt-1 text-[11px] text-slate-400">{inv.total_quantity || 0} total units in stock</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Laundry In-Process</span>
              <div className="mt-1 text-2xl font-bold text-sky-400">{laundry.in_process || 0} batches</div>
              <div className="mt-1 text-[11px] text-slate-400">{laundry.returned || 0} successfully returned</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Caskets Available</span>
              <div className="mt-1 text-2xl font-bold text-indigo-400">{caskets.available || 0}</div>
              <div className="mt-1 text-[11px] text-slate-400">{caskets.reserved || 0} currently reserved</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Total Utility Cost</span>
              <div className="mt-1 text-2xl font-bold text-rose-400">{formatCurrency(util.total_utility_cost || 0)}</div>
              <div className="mt-1 text-[11px] text-rose-400/90">{formatCurrency(util.total_unpaid || 0)} unpaid</div>
            </div>
          </div>

          {/* Module Deep-Dive Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory & Safety Stock Analysis */}
            <Card title="Inventory & Stock Health">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Unique Inventory Items</span>
                  <span className="font-semibold text-slate-100">{inv.total_items} items</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Quantity in Hand</span>
                  <span className="font-semibold text-slate-100">{inv.total_quantity} units</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Estimated Inventory Value</span>
                  <span className="font-bold text-amber-400">{formatCurrency(inv.valuation)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Low Stock Warnings</span>
                  <span className="font-semibold text-amber-400">{inv.low_stock} items</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Out of Stock Warnings</span>
                  <span className="font-semibold text-rose-400">{inv.out_of_stock} items</span>
                </div>
              </div>
            </Card>

            {/* Laundry & Linen Operations */}
            <Card title="Laundry Operations Summary">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Laundry Batches Processed</span>
                  <span className="font-semibold text-slate-100">{laundry.total} batches</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Currently in Washing / Drying / Folding</span>
                  <span className="font-semibold text-sky-400">{laundry.in_process} active</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Completed & Returned to Chapels</span>
                  <span className="font-semibold text-emerald-400">{laundry.returned} batches</span>
                </div>
              </div>
            </Card>

            {/* Facility Maintenance Analysis */}
            <Card title="Facility Maintenance & Repairs">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Maintenance Tickets</span>
                  <span className="font-semibold text-slate-100">{maint.total_tickets} tickets</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Open / Ongoing Issues</span>
                  <span className="font-semibold text-amber-400">{maint.open_tickets} tickets</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Completed Work Orders</span>
                  <span className="font-semibold text-emerald-400">{maint.completed_tickets} resolved</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Cumulative Repair Costs</span>
                  <span className="font-bold text-slate-100">{formatCurrency(maint.total_cost)}</span>
                </div>
              </div>
            </Card>

            {/* Utility Expenses */}
            <Card title="Utility Consumption & Unpaid Bills">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Water Consumption</span>
                  <span className="font-semibold text-sky-400">{util.water_consumption?.toFixed(1)} m³ ({formatCurrency(util.water_amount)})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Electricity Consumption</span>
                  <span className="font-semibold text-amber-400">{util.electricity_consumption?.toFixed(1)} kWh ({formatCurrency(util.electricity_amount)})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Unpaid Water Bills</span>
                  <span className="font-semibold text-rose-400">{formatCurrency(util.water_unpaid)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Unpaid Electricity Bills</span>
                  <span className="font-semibold text-rose-400">{formatCurrency(util.electricity_unpaid)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
