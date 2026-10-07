import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Select from '../components/common/Select';
import { CardSkeleton } from '../components/common/Skeleton';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Heart, Activity, CheckCircle2, Building2, Users, AlertTriangle } from 'lucide-react';

const DATE_FILTERS = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('this_month');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/analytics/', { date_filter: dateFilter });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      </div>
    );
  }

  const { summary_cards, trend_data, lamay_status, chapel_list, location_data, filter_info } = data;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-xs">
          <p className="font-bold text-slate-700 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }} className="font-medium">
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500 border border-[#0866FF]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-black-100 tracking-wide">
                Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of deaths, lamay/wakes, and chapel occupancies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-48">
            <Select
              options={DATE_FILTERS}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Select Period"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold">Total Deaths (All-time)</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700">{summary_cards.total_deceased}</div>
        </div>
        
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold">Deaths {filter_info?.label || 'This Period'}</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500">{summary_cards.period_deceased}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold">Active Lamay</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500">{summary_cards.active_lamay}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold">Completed Lamay</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-500">{summary_cards.completed_lamay}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold">Chapel Occupancy</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-500">{summary_cards.chapel_occupancy} / {summary_cards.total_chapels}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card title={`Death Trends - ${filter_info?.label || 'This Period'}`}>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Deaths" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Lamay Status Pie */}
        <Card title="Lamay/Wake Status Distribution">
          <div className="h-[300px] w-full mt-4 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={lamay_status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {lamay_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chapel Occupancy */}
        <Card title="Chapel Occupancy Status">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chapel_list} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="capacity" name="Capacity" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={15} />
                {/* Visual hack to show occupied status. In a real scenario we'd stack or group */}
                <Bar dataKey={(d) => d.status === 'OCCUPIED' ? 1 : 0} name="Occupied" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Location Analytics */}
        <Card title="Wake Locations">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={location_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="wake_location" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Wakes" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>
    </div>
  );
}
