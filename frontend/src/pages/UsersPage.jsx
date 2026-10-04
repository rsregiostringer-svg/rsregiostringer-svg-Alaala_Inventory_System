import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { ROLE_LABELS, formatDate } from '../utils/formatters';
import {
  UserPlus,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  User,
} from 'lucide-react';

const ROLES = [
  { value: 'MASTER_ADMIN', label: 'Master Admin (Full System & User Control)' },
  { value: 'ADMIN', label: 'Admin (Operations & Reports Management)' },
  { value: 'MANAGER', label: 'Manager (Branch Operations & Records)' },
  { value: 'STAFF', label: 'Staff (Daily Shift Tasks & Basic Operations)' },
];

export default function UsersPage() {
  const { user: currentUser, isMasterAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'STAFF',
    phone_number: '',
    location: '',
    is_active: true,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, lRes] = await Promise.all([
        api.get('/users/'),
        api.get('/locations/'),
      ]);
      setUsers(uRes.results || uRes);
      setLocations(lRes.results || lRes);
    } catch (err) {
      console.error('Error loading users:', err);
      setFeedback({ type: 'error', message: 'Failed to load user accounts.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Auto-hide feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const handleOpenCreate = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'STAFF',
      phone_number: '',
      location: '',
      is_active: true,
      password: '',
    });
    setShowPassword(false);
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      phone_number: user.phone_number || '',
      location: user.location ? String(user.location) : '',
      is_active: user.is_active,
      password: '',
    });
    setShowPassword(false);
    setEditUser(user);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        ...formData,
        username: formData.username.trim(),
        location: formData.location ? Number(formData.location) : null,
      };

      if (editUser) {
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser.id}/`, payload);
        setFeedback({
          type: 'success',
          message: `User account '${payload.username}' updated successfully.`,
        });
        setEditUser(null);
      } else {
        if (!payload.password || payload.password.length < 6) {
          setFormError('Password must be at least 6 characters long.');
          setFormLoading(false);
          return;
        }
        await api.post('/users/', payload);
        setFeedback({
          type: 'success',
          message: `New user account '${payload.username}' created successfully!`,
        });
        setIsCreateOpen(false);
      }
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to save user. Please check your inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${deleteTarget.id}/`);
      setFeedback({
        type: 'success',
        message: `User account '${deleteTarget.username}' was permanently removed.`,
      });
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete user account.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Search
    if (search) {
      const s = search.toLowerCase();
      const matchSearch =
        u.username?.toLowerCase().includes(s) ||
        u.first_name?.toLowerCase().includes(s) ||
        u.last_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.phone_number?.toLowerCase().includes(s);
      if (!matchSearch) return false;
    }

    // Role filter
    if (roleFilter !== 'ALL' && u.role !== roleFilter) {
      return false;
    }

    // Location filter
    if (locationFilter !== 'ALL') {
      if (locationFilter === 'UNASSIGNED') {
        if (u.location) return false;
      } else if (String(u.location) !== String(locationFilter)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'ACTIVE' && !u.is_active) return false;
    if (statusFilter === 'INACTIVE' && u.is_active) return false;

    return true;
  });

  const columns = [
    {
      header: 'Name & Username',
      key: 'username',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
            {row.first_name || row.last_name
              ? `${row.first_name} ${row.last_name}`
              : row.username}
            {currentUser?.id === row.id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <span>@{row.username}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      key: 'role',
      render: (row) => {
        let variant = 'secondary';
        let icon = null;
        if (row.role === 'MASTER_ADMIN') {
          variant = 'warning';
          icon = <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-amber-400" />;
        } else if (row.role === 'ADMIN') {
          variant = 'primary';
          icon = <Shield className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />;
        } else if (row.role === 'MANAGER') {
          variant = 'success';
        }

        return (
          <Badge variant={variant} className="font-medium">
            {icon}
            {ROLE_LABELS[row.role] || row.role}
          </Badge>
        );
      },
    },
    {
      header: 'Contact Info',
      key: 'email',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-xs text-slate-200 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{row.email || '—'}</span>
          </div>
          {row.phone_number && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{row.phone_number}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Home Branch / Location',
      key: 'location_details',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{row.location_details?.name || 'All Branches (Enterprise)'}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Joined Date',
      key: 'date_joined',
      render: (row) => (
        <span className="text-xs text-slate-400">{formatDate(row.date_joined)}</span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        const isSelf = currentUser?.id === row.id;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenEdit(row)}
              icon={Edit2}
            >
              Edit
            </Button>
            {isMasterAdmin && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteTarget(row)}
                disabled={isSelf}
                title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                icon={Trash2}
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Privilege Status */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isMasterAdmin
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
            }`}
          >
            {isMasterAdmin ? (
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            ) : (
              <Shield className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-slate-100 tracking-wide">
                User Accounts & Permissions
              </h1>
              {isMasterAdmin ? (
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Master Admin Mode
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                  Admin View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isMasterAdmin
                ? 'As Master Admin, you have full authority to create, edit, assign roles, and manage users across all branches.'
                : 'Account creation and permanent removal require Master Admin privileges.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadUsers} icon={RefreshCw}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={UserPlus}
            disabled={!isMasterAdmin}
            title={
              isMasterAdmin
                ? 'Create a new user account'
                : 'Only Master Admin can create new user accounts'
            }
          >
            New User
          </Button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:text-white ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, username, email, phone..."
            className="flex-1 max-w-md"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-amber-500"
            >
              <option value="ALL">All Roles</option>
              <option value="MASTER_ADMIN">Master Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-amber-500"
            >
              <option value="ALL">All Branches</option>
              <option value="UNASSIGNED">Enterprise (All Branches)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-amber-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <span className="text-xs text-slate-400 font-medium ml-2">
              {filteredUsers.length} Users
            </span>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyTitle="No users match your criteria"
        emptyDescription={
          isMasterAdmin
            ? 'Click "New User" above to create an account for your staff.'
            : 'No user accounts found matching current filters.'
        }
      />

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen || !!editUser}
        onClose={() => {
          setIsCreateOpen(false);
          setEditUser(null);
        }}
        title={editUser ? `Edit Account: @${editUser.username}` : 'Create New User Account'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section: Credentials */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Login Credentials
            </h3>

            <Input
              label="Username"
              required
              disabled={!!editUser}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. maria.santos"
              helperText={
                editUser
                  ? 'Username cannot be modified after account creation.'
                  : 'Used by the user to log in.'
              }
            />

            <div className="relative">
              <Input
                label={
                  editUser
                    ? 'Reset Password (Leave blank to keep existing)'
                    : 'Account Password'
                }
                type={showPassword ? 'text' : 'password'}
                required={!editUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                helperText="Must be at least 6 characters long."
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Section: Personal Info */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Staff Profile
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Maria"
              />

              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Santos"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="maria@alaalafuneralhomes.com"
              />

              <Input
                type="tel"
                label="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="0917-123-4567"
              />
            </div>
          </div>

          {/* Section: Roles and Location */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Permissions & Branch Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="System Role"
                required
                options={ROLES}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />

              <Select
                label="Assigned Branch"
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="All Branches (Enterprise)"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
              />
              <label htmlFor="is_active_toggle" className="text-xs text-slate-300 cursor-pointer">
                Account Active (Allows the user to sign in to the Alaala system)
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setEditUser(null);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading} icon={editUser ? null : UserPlus}>
              {editUser ? 'Save Changes' : 'Create User Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm User Account Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300">
              <p className="font-semibold text-rose-200">Warning: This action cannot be undone.</p>
              <p className="mt-1">
                You are about to permanently delete the user account{' '}
                <strong className="text-white">@{deleteTarget?.username}</strong>
                {deleteTarget?.first_name || deleteTarget?.last_name
                  ? ` (${deleteTarget?.first_name} ${deleteTarget?.last_name})`
                  : ''}
                .
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            The user will immediately lose access to all modules. An entry will be permanently logged
            in the system audit log with your Master Admin signature.
          </p>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteUser}
              loading={deleteLoading}
              icon={Trash2}
            >
              Permanently Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
