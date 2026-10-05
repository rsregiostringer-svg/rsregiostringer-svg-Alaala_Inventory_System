import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Shirt,
  Box,
  Wrench,
  Droplet,
  Zap,
  BarChart3,
  TrendingUp,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Radio,
  Building2,
  ChevronDown,
  User,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function MainLayout() {
  const {
    user,
    logout,
    updateUser,
    isMasterAdmin,
    isSimpleAdmin,
    canAccessWater,
    canAccessElectricity,
    canViewReports
  } = useAuth();
  const { isWsConnected } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar Collapse state: Persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Header User Dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Profile Modal State (Self-editing)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Toggle and persist sidebar
  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (err) {
        console.warn('localStorage error:', err);
      }
      return next;
    });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Self Profile Modal Handlers
  const handleOpenProfileModal = () => {
    setProfileDropdownOpen(false);
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      username: user?.username || '',
      email: user?.email || '',
      phone_number: user?.phone_number || ''
    });
    setProfileError('');
    setProfileSuccess('');
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await api.put('/auth/profile/', profileForm);
      if (updateUser) {
        updateUser(res.user);
      }
      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSuccess('');
      }, 1500);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change Password Handlers
  const handleOpenPasswordModal = () => {
    setProfileDropdownOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword) {
      setPasswordError('Please fill in both current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Grouped Navigation Sections (Clean & Clear)
  const navSections = [
    {
      title: 'DASHBOARD',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { to: '/inventory', label: 'Inventory', icon: Package },
        ...(isMasterAdmin
          ? [{ to: '/inventory/transactions', label: 'Inventory Transactions', icon: ArrowLeftRight }]
          : []),
        { to: '/laundry', label: 'Laundry', icon: Shirt },
        { to: '/caskets', label: 'Caskets', icon: Box },
        { to: '/chapels', label: 'Chapel & Lamay', icon: Building2 },
        { to: '/maintenance', label: 'Maintenance', icon: Wrench },
        ...(canAccessWater
          ? [{ to: '/water', label: 'Water', icon: Droplet }]
          : []),
        ...(canAccessElectricity
          ? [{ to: '/electricity', label: 'Electricity', icon: Zap }]
          : [])
      ]
    },
    ...(isMasterAdmin
      ? [
        {
          title: 'MANAGEMENT',
          items: [
            { to: '/users', label: 'Users', icon: Users },
            { to: '/roles', label: 'User Roles', icon: ShieldCheck }
          ]
        },
        {
          title: 'REPORTS',
          items: [
            { to: '/reports', label: 'Reports', icon: BarChart3 },
            { to: '/analytics', label: 'Analytics', icon: TrendingUp }
          ]
        },
        {
          title: 'SYSTEM',
          items: [
            { to: '/audit-logs', label: 'Audit Logs', icon: Lock },
            { to: '/settings', label: 'Settings', icon: Settings }
          ]
        }
      ]
      : canViewReports
        ? [
          {
            title: 'REPORTS',
            items: [
              { to: '/reports', label: 'Reports', icon: BarChart3 }
            ]
          }
        ]
        : [])
  ];

  // Role Badge Styling - Simple and Clean
  const getRoleBadge = () => {
    if (isMasterAdmin) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Master Admin
        </span>
      );
    }
    if (isSimpleAdmin) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
          Admin
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
        <User className="w-3.5 h-3.5 text-slate-600" />
        Staff
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-slate-900">ALAALA</span>
            <span className="block text-[10px] text-slate-500 font-medium tracking-wider uppercase">
              Funeral Homes
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getRoleBadge()}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Collapsible / Expandable Sidebar Navigation - Clean White */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-40 transition-all duration-200 ease-in-out ${isCollapsed ? 'md:w-20' : 'md:w-64'
          } ${mobileMenuOpen
            ? 'w-72 translate-x-0 shadow-xl'
            : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Brand Header & Sidebar Toggle Button */}
        <div className={`p-4 border-b border-slate-200 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <span className="font-bold text-base text-white">A</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm tracking-wide text-slate-900 truncate">
                  ALAALA
                </h1>
                <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase truncate">
                  Funeral Homes
                </p>
              </div>
            </div>
          )}

          {/* Desktop Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSidebar}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Realtime Status Indicator (Expanded only) */}
        {!isCollapsed && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isWsConnected ? 'bg-blue-600' : 'bg-slate-400'
                  }`}
              />
              <span className="text-slate-600 text-[11px] font-medium truncate">
                {isWsConnected ? 'System Connected' : 'Sync Active'}
              </span>
            </div>
            <Radio className={`w-3.5 h-3.5 shrink-0 ${isWsConnected ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
        )}

        {/* Navigation Links Grouped by Section */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                      } rounded-lg text-sm font-medium transition-colors group relative ${isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {/* Collapsed Tooltip floating on hover */}
                    {isCollapsed && (
                      <div className="hidden group-hover:block absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Quick Logout */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'
              } p-2 rounded-lg text-sm font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span>Logout</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Desktop Application Header - Clean White */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-6 items-center justify-between z-20 shrink-0">
          {/* Left: Sidebar Toggle & System Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSidebar}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-wide">
                ALAALA FUNERAL HOMES
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-medium">Management System</span>
            </div>
          </div>

          {/* Right: User Profile Dropdown */}
          <div className="flex items-center gap-4">
            {getRoleBadge()}

            {/* Profile Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.first_name ? user.first_name[0].toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-slate-800">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">@{user?.username}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                    </p>
                    <p className="text-[11px] text-blue-600 font-medium mt-0.5 truncate">
                      @{user?.username} &bull; {user?.role}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleOpenProfileModal}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={handleOpenPasswordModal}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      <span>Change Password</span>
                    </button>

                    {isMasterAdmin && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('/roles');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors text-left"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>User Roles & Permissions</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* HEADER MODAL: MY PROFILE */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="My Profile Information"
        subtitle="Manage your identity and account details"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={profileForm.first_name}
              onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
              placeholder="First name"
            />
            <Input
              label="Last Name"
              required
              value={profileForm.last_name}
              onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
              placeholder="Last name"
            />
          </div>

          <Input
            label="System Username"
            required
            value={profileForm.username}
            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
            placeholder="Unique username"
          />

          <Input
            type="email"
            label="Email Address (Optional)"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            placeholder="email@example.com"
          />

          <Input
            label="Phone Number (Optional)"
            value={profileForm.phone_number}
            onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
            placeholder="+63 9XX XXX XXXX"
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProfileModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={profileLoading}
              icon={Check}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* HEADER MODAL: CHANGE PASSWORD */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        subtitle="Ensure your new password contains at least 6 characters"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <Input
            type="password"
            label="Current Password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Enter current password"
          />

          <Input
            type="password"
            label="New Password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />

          <Input
            type="password"
            label="Confirm New Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={passwordLoading}
              icon={Lock}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
