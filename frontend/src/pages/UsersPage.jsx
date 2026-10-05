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
  User,
} from 'lucide-react';

const ROLES = [
  { value: 'MASTER_ADMIN', label: 'Master Admin (Full System & User Control)' },
  { value: 'ADMIN', label: 'Admin (Operations & Reports Management)' },
  { value: 'MANAGER', label: 'Manager (Office Operations & Records)' },
  { value: 'STAFF', label: 'Staff (Daily Shift Tasks & Basic Operations)' },
];

export default function UsersPage() {
  const { user: currentUser, isMasterAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State - NO branch assignment, only office
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    role: 'STAFF',
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
      const uRes = await api.get('/users/');
      setUsers(uRes.results || uRes);
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

  const handleNameChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      if (!editUser) {
        const first = field === 'first_name' ? val : prev.first_name;
        const last = field === 'last_name' ? val : prev.last_name;
        const cleanFirst = first.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanLast = last.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const prevCleanFirst = prev.first_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const prevCleanLast = prev.last_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const prevSuggested = prevCleanFirst && prevCleanLast ? `${prevCleanFirst}.${prevCleanLast}` : prevCleanFirst || prevCleanLast;
        if (!prev.username || prev.username === prevSuggested) {
          updated.username = cleanFirst && cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst || cleanLast;
        }
      }
      return updated;
    });
  };

  const handleOpenCreate = () => {
    setFormData({
      first_name: '',
      last_name: '',
      username: '',
      role: 'STAFF',
      is_active: true,
      password: '',
    });
    setShowPassword(false);
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username,
      role: user.role,
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

    if (!formData.first_name.trim()) {
      setFormError('First Name is required.');
      setFormLoading(false);
      return;
    }
    if (!formData.last_name.trim()) {
      setFormError('Last Name is required.');
      setFormLoading(false);
      return;
    }
    if (!formData.username.trim()) {
      setFormError('Username is required.');
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        username: formData.username.trim(),
        role: formData.role,
        location: null, // No branch assignment, only office
        is_active: formData.is_active,
      };

      if (editUser) {
        if (formData.password && formData.password.trim()) {
          if (formData.password.length < 6) {
            setFormError('Password must be at least 6 characters long.');
            setFormLoading(false);
            return;
          }
          payload.password = formData.password;
        }
        await api.put(`/users/${editUser.id}/`, payload);
        setFeedback({
          type: 'success',
          message: `User '${payload.username}' (${payload.first_name} ${payload.last_name}) updated successfully.`,
        });
        setEditUser(null);
      } else {
        if (!formData.password || formData.password.length < 6) {
          setFormError('Password must be at least 6 characters long.');
          setFormLoading(false);
          return;
        }
        payload.password = formData.password;
        await api.post('/users/', payload);
        setFeedback({
          type: 'success',
          message: `New user '${payload.username}' for ${payload.first_name} ${payload.last_name} created successfully.`,
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
        u.last_name?.toLowerCase().includes(s);
      if (!matchSearch) return false;
    }

    // Role filter
    if (roleFilter !== 'ALL' && u.role !== roleFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'ACTIVE' && !u.is_active) return false;
    if (statusFilter === 'INACTIVE' && u.is_active) return false;

    return true;
  });

  const columns = [
    {
      header: 'Full Name & Username',
      key: 'username',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
            {row.first_name || row.last_name
              ? `${row.first_name} ${row.last_name}`
              : row.username}
            {currentUser?.id === row.id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            @{row.username}
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (row) => {
        let variant = 'neutral';
        if (row.role === 'MASTER_ADMIN') {
          variant = 'blue';
        } else if (row.role === 'ADMIN') {
          variant = 'blue';
        } else if (row.role === 'MANAGER') {
          variant = 'neutral';
        }

        return (
          <Badge variant={variant}>
            {ROLE_LABELS[row.role] || row.role}
          </Badge>
        );
      },
    },
    {
      header: 'Office',
      key: 'office',
      render: () => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Main Office</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'blue' : 'red'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Date Created',
      key: 'date_joined',
      render: (row) => (
        <span className="text-xs text-slate-600 font-mono">
          {formatDate(row.date_joined)}
        </span>
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
      {/* Top Header Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Users & Access Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage system access and office user accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadUsers} icon={RefreshCw}>
            Refresh
          </Button>
          {isMasterAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              icon={UserPlus}
            >
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80 ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or username..."
            className="flex-1 max-w-md"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-blue-600"
            >
              <option value="ALL">All Roles</option>
              <option value="MASTER_ADMIN">Master Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-hidden focus:border-blue-600"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <span className="text-xs text-slate-500 font-medium ml-2">
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
        emptyTitle="No users found"
        emptyDescription={
          isMasterAdmin
            ? 'Click "Add User" above to create an account.'
            : 'No user accounts found matching current filters.'
        }
      />

      {/* User Create/Edit Modal - NO branch assignment, only office */}
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Staff Name */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Staff Full Name
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={formData.first_name}
                onChange={(e) => handleNameChange('first_name', e.target.value)}
                placeholder="e.g. Juan"
              />

              <Input
                label="Last Name"
                required
                value={formData.last_name}
                onChange={(e) => handleNameChange('last_name', e.target.value)}
                placeholder="e.g. Dela Cruz"
              />
            </div>
          </div>

          {/* Section 2: Login Credentials */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" /> Login Credentials
            </h3>

            <Input
              label="Username"
              required
              disabled={!!editUser}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. juan.delacruz"
              helperText={
                editUser
                  ? 'Username cannot be modified after account creation.'
                  : 'Auto-suggested from full name.'
              }
            />

            <div className="relative">
              <Input
                label={
                  editUser
                    ? 'Reset Password (Leave blank to keep existing)'
                    : 'Password'
                }
                type={showPassword ? 'text' : 'password'}
                required={!editUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Section 3: Role Assignment - Only Office */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Role & Office
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="System Role"
                required
                options={ROLES}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Office Location
                </label>
                <div className="h-10 px-3 flex items-center text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  Main Office
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="is_active_toggle" className="text-xs text-slate-700 cursor-pointer">
                Account Active (Allows the user to sign in to the system)
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditUser(null);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading} icon={editUser ? null : UserPlus}>
              {editUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User Account"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-semibold text-red-900">This action cannot be undone.</p>
              <p className="mt-1">
                You are about to permanently delete user account{' '}
                <strong>@{deleteTarget?.username}</strong>
                {deleteTarget?.first_name || deleteTarget?.last_name
                  ? ` (${deleteTarget?.first_name} ${deleteTarget?.last_name})`
                  : ''}
                .
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button
              variant="secondary"
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
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
