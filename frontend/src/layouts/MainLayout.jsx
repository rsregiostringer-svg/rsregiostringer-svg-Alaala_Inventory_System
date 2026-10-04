import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Shirt,
  Box,
  Wrench,
  Droplet,
  Zap,
  BarChart3,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Radio,
  Building2,
  ChevronDown
} from 'lucide-react';
import { ROLE_LABELS } from '../utils/formatters';

export default function MainLayout() {
  const { user, logout, isMasterAdmin, isAdmin } = useAuth();
  const { isWsConnected } = useRealtime();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'General Inventory', icon: Package },
    { to: '/inventory/transactions', label: 'Inventory Transactions', icon: ArrowLeftRight },
    { to: '/laundry', label: 'Laundry Monitoring', icon: Shirt, badge: 'Workflow' },
    { to: '/caskets', label: 'Casket Inventory', icon: Box },
    { to: '/maintenance', label: 'Chapel Maintenance', icon: Wrench },
    { to: '/water', label: 'Water Monitoring', icon: Droplet },
    { to: '/electricity', label: 'Electricity Monitoring', icon: Zap },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    ...(isAdmin ? [{ to: '/users', label: 'Users & Roles', icon: Users }] : []),
    ...(isAdmin ? [{ to: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck }] : []),
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif font-black text-sm">
            A
          </div>
          <div>
            <span className="font-serif font-bold text-sm tracking-wider text-slate-100">ALAALA</span>
            <span className="block text-[10px] text-amber-400/90 font-medium tracking-widest uppercase">Funeral Homes</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-68 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col z-40 transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-500/50 flex items-center justify-center shadow-inner">
            <span className="font-serif font-black text-lg text-amber-400">A</span>
          </div>
          <div>
            <h1 className="font-serif font-bold text-base tracking-wider text-slate-100">ALAALA</h1>
            <p className="text-[10px] text-amber-400/90 font-medium tracking-widest uppercase">Funeral Homes</p>
          </div>
        </div>

        {/* Realtime Stream Status Indicator */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'
              }`}
            />
            <span className="text-slate-400 text-[11px] font-medium">
              {isWsConnected ? 'Live Realtime Stream' : 'Live Auto-Sync (20s)'}
            </span>
          </div>
          <Radio className={`w-3.5 h-3.5 ${isWsConnected ? 'text-emerald-400' : 'text-sky-400'}`} />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card in Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </p>
              </div>
              <p className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
                {ROLE_LABELS[user?.role] || user?.role}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
