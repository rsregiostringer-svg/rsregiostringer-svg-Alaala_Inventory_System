import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import SearchInput from '../components/common/SearchInput';
import { Skeleton, CardSkeleton } from '../components/common/Skeleton';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  Check,
  User,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { ROLE_LABELS, formatDate } from '../utils/formatters';

const ROLE_OPTIONS = [
  { value: 'MASTER_ADMIN', label: 'Master Admin (Full System Ownership & Administration)' },
  { value: 'ADMIN', label: 'Simple Admin (Limited Branch Operations & Management)' },
  { value: 'MANAGER', label: 'Manager (Department & Inventory Supervision)' },
  { value: 'STAFF', label: 'Staff (Basic Daily Operational Tasks)' },
];

const SHIFT_OPTIONS = [
  { value: '8am to 5pm', label: 'Morning Shift (8:00 AM – 5:00 PM)' },
  { value: '4pm to 1am', label: 'Afternoon / Evening Shift (4:00 PM – 1:00 AM)' },
  { value: '12midnight to 9am', label: 'Graveyard / Night Shift (12:00 Midnight – 9:00 AM)' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active (Full Access Allowed)' },
  { value: 'INACTIVE', label: 'Inactive (Login Blocked)' },
  { value: 'SUSPENDED', label: 'Suspended (Access Temporarily Revoked)' },
];

export default function UserRolesPage() {
  const { user: currentUser, isMasterAdmin, updateUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Password Change Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Profile Edit Form (Self-editing)
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // User Create / Edit Form
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    role: 'STAFF',
    status: 'ACTIVE',
    shift: '8am to 5pm',
    assigned_locations: [],
    custom_permissions: {
      water: false,
      electricity: false,
      reports: false
    },
    password: '',
    is_active: true
  });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pending Dangerous Action
  const [pendingAction, setPendingAction] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, lRes] = await Promise.all([
        api.get('/users/'),
        api.get('/locations/')
      ]);
      setUsers(uRes.results || uRes);
      setLocations(lRes.results || lRes);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load system users and locations.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Self Profile Modal
  const handleOpenProfileModal = () => {
    setProfileForm({
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      username: currentUser?.username || '',
      email: currentUser?.email || '',
      phone_number: currentUser?.phone_number || ''
    });
    setProfileError('');
    setIsProfileModalOpen(true);
  };

  // Submit Self Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');

    try {
      const res = await api.put('/auth/profile/', profileForm);
      if (updateUser) {
        updateUser(res.user);
      }
      setFeedback({ type: 'success', message: 'Your Master Admin profile details updated successfully!' });
      setIsProfileModalOpen(false);
      loadData();
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile information.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Password Change
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
      setPasswordSuccess('Password updated successfully! Your administrative credentials remain secure.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please check your existing password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone_number: '',
      role: 'STAFF',
      status: 'ACTIVE',
      shift: '8am to 5pm',
      assigned_locations: [],
      custom_permissions: {
        water: false,
        electricity: false,
        reports: false
      },
      password: '',
      is_active: true
    });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    const locIds = (u.assigned_locations || []).map((l) => (typeof l === 'object' ? l.id : l));
    if (u.location && !locIds.includes(u.location)) {
      locIds.push(u.location);
    }

    setUserForm({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      username: u.username || '',
      email: u.email || '',
      phone_number: u.phone_number || '',
      role: u.role || 'STAFF',
      status: u.status || 'ACTIVE',
      shift: u.shift || '8am to 5pm',
      assigned_locations: locIds,
      custom_permissions: {
        water: Boolean(u.custom_permissions?.water),
        electricity: Boolean(u.custom_permissions?.electricity),
        reports: Boolean(u.custom_permissions?.reports)
      },
      password: '',
      is_active: u.is_active !== undefined ? u.is_active : true
    });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  // Execute Save User (with safety confirmation intercept if modifying own Master Admin account)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserFormError('');

    // Check dangerous self-demotion or self-deactivation
    if (editingUser && editingUser.id === currentUser?.id) {
      if (userForm.role !== 'MASTER_ADMIN' || userForm.status !== 'ACTIVE' || !userForm.is_active) {
        setPendingAction(() => executeUserSave);
        setIsWarningModalOpen(true);
        return;
      }
    }

    await executeUserSave();
  };

  const executeUserSave = async () => {
    setUserFormLoading(true);
    setUserFormError('');

    const payload = {
      first_name: userForm.first_name.trim(),
      last_name: userForm.last_name.trim(),
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      phone_number: userForm.phone_number.trim(),
      role: userForm.role,
      status: userForm.status,
      shift: userForm.shift,
      assigned_locations: userForm.assigned_locations,
      custom_permissions: userForm.custom_permissions,
      is_active: userForm.status === 'ACTIVE'
    };

    if (userForm.password) {
      payload.password = userForm.password;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}/`, payload);
        setFeedback({ type: 'success', message: `User "${payload.username}" updated successfully.` });
      } else {
        if (!userForm.password) {
          setUserFormError('Password is required when creating a new user.');
          setUserFormLoading(false);
          return;
        }
        await api.post('/users/', payload);
        setFeedback({ type: 'success', message: `New user "${payload.username}" created successfully.` });
      }

      setIsUserModalOpen(false);
      setIsWarningModalOpen(false);
      loadData();
    } catch (err) {
      setUserFormError(err.message || 'Failed to save user account.');
    } finally {
      setUserFormLoading(false);
    }
  };

  // Delete User Confirmation
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/users/${deleteTarget.id}/`);
      setFeedback({ type: 'success', message: `Account "${deleteTarget.username}" permanently deleted.` });
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Unable to delete user.' });
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Location toggle helper in modal
  const toggleLocation = (locId) => {
    setUserForm((prev) => {
      const exists = prev.assigned_locations.includes(locId);
      return {
        ...prev,
        assigned_locations: exists
          ? prev.assigned_locations.filter((id) => id !== locId)
          : [...prev.assigned_locations, locId]
      };
    });
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.last_name || '').toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title: Section 29 Spec */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-white via-slate-900/95 to-[#F0F2F5] border border-slate-200 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-600/10 text-blue-500 border border-[#0866FF]/20 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  ACCESS CONTROL, ACCOUNT SECURITY & ADMIN AUTHORITY MATRIX
                </h1>
                <Badge variant="primary" size="sm">
                  MASTER ADMIN / VERIFIED
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Role authorization rules governing user account creation, profile edits, deletions, and administrative credentials.
              </p>
            </div>
          </div>

          {/* Security Action Buttons: Section 29 Spec */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={KeyRound}
              onClick={() => {
                setPasswordError('');
                setPasswordSuccess('');
                setIsPasswordModalOpen(true);
              }}
            >
              CHANGE MY PASSWORD
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={User}
              onClick={handleOpenProfileModal}
            >
              MY PROFILE
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={handleOpenCreateUser}
            >
              CREATE NEW USER
            </Button>
          </div>
        </div>

        {/* 4 Authority Summary Cards: Section 29 Spec */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Card 1: ACTIVE SESSION */}
          <div className="p-4 rounded-xl bg-[#F0F2F5]/70 border border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                ACTIVE SESSION
              </span>
              <div className="text-sm font-bold text-slate-100 mt-1">
                {currentUser?.first_name
                  ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
                  : currentUser?.username || 'Master Administrator'}
              </div>
              <div className="text-xs text-blue-500 font-mono mt-0.5">@{currentUser?.username}</div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Security Level:</span>
              <span className="font-bold text-emerald-400">MASTER ADMIN / VERIFIED</span>
            </div>
          </div>

          {/* Card 2: CREATE USERS & ADMINS */}
          <div className="p-4 rounded-xl bg-[#F0F2F5]/70 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">CREATE USERS & ADMINS</span>
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-slate-100 mt-1">Full Provisioning Authority</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Only Master Admin can create: Master Admin, Admin / Simple Admin, Manager, and Staff.
            </p>
          </div>

          {/* Card 3: EDIT & UPDATE PROFILES */}
          <div className="p-4 rounded-xl bg-[#F0F2F5]/70 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">EDIT & UPDATE PROFILES</span>
              <Edit3 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xs font-bold text-slate-100 mt-1">All Accounts & Self-Profile</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Modify account details, contact information, branch assignments, roles, permissions, and shifts.
            </p>
          </div>

          {/* Card 4: DELETE ACCOUNTS & RECORDS */}
          <div className="p-4 rounded-xl bg-[#F0F2F5]/70 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">DELETE ACCOUNTS & RECORDS</span>
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xs font-bold text-slate-100 mt-1">Permanent Deletions Only</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Restricted for normal users. Only Master Admin can perform permanent deletions with warnings.
            </p>
          </div>
        </div>

        {/* Master Authority Matrix Table: Section 29 Spec */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-[#F0F2F5]/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-white/80 text-slate-600">
                <th className="py-3 px-4 font-bold">System Role</th>
                <th className="py-3 px-4 font-bold">Create Users / Admins</th>
                <th className="py-3 px-4 font-bold">Edit & Update</th>
                <th className="py-3 px-4 font-bold">Delete Accounts</th>
                <th className="py-3 px-4 font-bold">Delete System Records</th>
                <th className="py-3 px-4 font-bold">Operational Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              <tr className="hover:bg-white/50 transition-colors bg-[#0866FF]/5">
                <td className="py-3 px-4 font-bold text-blue-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  MASTER ADMIN
                </td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">
                  Full Authority (Any Role)
                </td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">
                  All Accounts & Roles
                </td>
                <td className="py-3 px-4 text-rose-400 font-semibold">
                  Permanent Account Deletion
                </td>
                <td className="py-3 px-4 text-rose-400 font-semibold">
                  Batches, Caskets & Records
                </td>
                <td className="py-3 px-4 text-slate-700">
                  Total system ownership & configuration
                </td>
              </tr>
              <tr className="hover:bg-white/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  ADMIN / SIMPLE ADMIN
                </td>
                <td className="py-3 px-4 text-slate-500">
                  No — Master Admin Only
                </td>
                <td className="py-3 px-4 text-[#0866FF]">
                  Staff & Managers
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted — Cannot Delete
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-600">
                  Day-to-day operations & reports
                </td>
              </tr>
              <tr className="hover:bg-white/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-600">
                  MANAGER
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Self Profile Only
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-600">
                  Inventory replenishment & department supervision
                </td>
              </tr>
              <tr className="hover:bg-white/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-500">
                  STAFF
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Self Password Only
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Restricted
                </td>
                <td className="py-3 px-4 text-slate-600">
                  Data entry, shift tracking & laundry stage advancing
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3 text-xs">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 3: USER ACCOUNT MANAGEMENT */}
      <Card
        title="User Account Management & Role Provisioning"
        subtitle="Active personnel profiles, assigned facilities, working shifts, and granular module permissions"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={loadData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={handleOpenCreateUser}
            >
              Add User
            </Button>
          </div>
        }
      >
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or username..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Roles' },
                ...ROLE_OPTIONS
              ]}
              className="text-xs"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                ...STATUS_OPTIONS
              ]}
              className="text-xs"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F0F2F5]/60 text-slate-500">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">System Role</th>
                <th className="py-3 px-4 font-semibold">Assigned Locations</th>
                <th className="py-3 px-4 font-semibold">Work Shift</th>
                <th className="py-3 px-4 font-semibold">Custom Perms</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No user accounts match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const assignedLocs = u.assigned_location_details || [];

                  return (
                    <tr key={u.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center font-bold text-blue-500">
                            {u.first_name ? u.first_name[0].toUpperCase() : u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <span>{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-600/20 text-[#0866FF] border border-[#0866FF]/30">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={u.role === 'MASTER_ADMIN' ? 'primary' : u.role === 'ADMIN' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {u.role === 'MASTER_ADMIN' ? (
                          <span className="text-emerald-400 font-semibold text-[11px]">ALL LOCATIONS (UNRESTRICTED)</span>
                        ) : assignedLocs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedLocs.map((loc) => (
                              <span
                                key={loc.id}
                                className="px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-600 border border-slate-300"
                              >
                                {loc.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">None assigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="text-[11px]">{u.shift || '8am to 5pm'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.custom_permissions?.water && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px]">
                              Water
                            </span>
                          )}
                          {u.custom_permissions?.electricity && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-500 border border-[#0866FF]/20 text-[10px]">
                              Elec
                            </span>
                          )}
                          {u.custom_permissions?.reports && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                              Reports
                            </span>
                          )}
                          {!u.custom_permissions?.water && !u.custom_permissions?.electricity && !u.custom_permissions?.reports && (
                            <span className="text-slate-600 text-[11px]">&mdash;</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={u.status === 'ACTIVE' && u.is_active ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'neutral'}
                          size="sm"
                        >
                          {u.status || (u.is_active ? 'ACTIVE' : 'INACTIVE')}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit3}
                            onClick={() => handleOpenEditUser(u)}
                            title="Edit User Profile"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => {
                              setDeleteTarget(u);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete User Account"
                            className="text-slate-500 hover:text-rose-400"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: CHANGE MY PASSWORD */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Account Security: Update Password"
        subtitle="Protect your administrative credentials with an encrypted password"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
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
            placeholder="Enter your existing password"
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
            placeholder="Re-enter new password"
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
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

      {/* MODAL 2: MY PROFILE (Master Admin Self-Edit) */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Master Admin: My Profile"
        subtitle="Manage your identity, administrative credentials, and contact details"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {profileError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-600/10 border border-[#0866FF]/20 text-xs text-[#0866FF] flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-500" />
            <span>You are editing your active Master Admin account. Keep your login username memorable.</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name / Given Name"
              required
              value={profileForm.first_name}
              onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
              placeholder="e.g. Juan"
            />
            <Input
              label="Last Name / Surname"
              required
              value={profileForm.last_name}
              onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
              placeholder="e.g. Dela Cruz"
            />
          </div>

          <Input
            label="System Username"
            required
            value={profileForm.username}
            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
            placeholder="Username used for login"
          />

          <Input
            type="email"
            label="Email Address (Optional)"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            placeholder="admin@alaala.ph"
          />

          <Input
            label="Contact Phone Number (Optional)"
            value={profileForm.phone_number}
            onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
            placeholder="+63 9XX XXX XXXX"
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
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
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.username}` : 'Provision New System User'}
        subtitle="Configure personal credentials, operational role, shift, and branch access"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {userFormError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{userFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name / Given Name"
              required
              value={userForm.first_name}
              onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
              placeholder="e.g. Maria"
            />
            <Input
              label="Last Name / Surname"
              required
              value={userForm.last_name}
              onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
              placeholder="e.g. Santos"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              required
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              placeholder="Unique system login ID"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {editingUser ? 'Change Password (Leave empty to keep)' : 'Initial Password *'}
              </label>
              <div className="relative">
                <input
                  type={showUserPassword ? 'text' : 'password'}
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? 'Enter new password if changing' : 'Min 6 characters'}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0866FF] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPassword(!showUserPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="System Role"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              options={ROLE_OPTIONS}
            />

            <Select
              label="Operational Shift"
              value={userForm.shift}
              onChange={(e) => setUserForm({ ...userForm, shift: e.target.value })}
              options={SHIFT_OPTIONS}
            />

            <Select
              label="Account Status"
              value={userForm.status}
              onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
              options={STATUS_OPTIONS}
            />
          </div>

          {/* Assigned Locations Checklist */}
          {userForm.role !== 'MASTER_ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Assigned Operational Locations (Data Isolation Enforced)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                This user will only have access to records and dashboards belonging to the checked locations.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[#F0F2F5]/60 border border-slate-200">
                {locations.map((loc) => {
                  const isChecked = userForm.assigned_locations.includes(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-xs text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleLocation(loc.id)}
                        className="rounded border-slate-300 text-[#0866FF] focus:ring-[#0866FF]"
                      />
                      <span>{loc.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Permissions Checkboxes */}
          {userForm.role !== 'MASTER_ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Optional Permissions for Staff / Simple Admin
              </label>
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#F0F2F5]/60 border border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userForm.custom_permissions.water}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        custom_permissions: { ...userForm.custom_permissions, water: e.target.checked }
                      })
                    }
                    className="rounded border-slate-300 text-[#0866FF] focus:ring-[#0866FF]"
                  />
                  <span>Water Monitoring</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userForm.custom_permissions.electricity}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        custom_permissions: { ...userForm.custom_permissions, electricity: e.target.checked }
                      })
                    }
                    className="rounded border-slate-300 text-[#0866FF] focus:ring-[#0866FF]"
                  />
                  <span>Electricity Monitoring</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userForm.custom_permissions.reports}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        custom_permissions: { ...userForm.custom_permissions, reports: e.target.checked }
                      })
                    }
                    className="rounded border-slate-300 text-[#0866FF] focus:ring-[#0866FF]"
                  />
                  <span>View Reports</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={userFormLoading}
              icon={Check}
            >
              {editingUser ? 'Save User Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: WARNING BEFORE CHANGING OWN MASTER ADMIN ROLE */}
      <Modal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        title="CRITICAL SECURITY WARNING"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-200">
                WARNING: You are modifying your own Master Admin account.
              </p>
              <p>
                Removing your Master Admin privileges, deactivating yourself, or suspending your account will immediately revoke your administrative authority.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Are you completely sure you want to continue with this action?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={() => setIsWarningModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={userFormLoading}
              onClick={() => pendingAction && pendingAction()}
            >
              Confirm and Proceed
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Permanent Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-200">
                WARNING: This action is permanent and cannot be easily undone.
              </p>
              <p>
                You are about to permanently delete account <strong>{deleteTarget?.username}</strong>. All associated audit records will remain archived.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteLoading}
              onClick={handleDeleteUser}
              icon={Trash2}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
