import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { ROLE_LABELS, formatDate } from '../utils/formatters';
import { Plus, Users, Shield, RefreshCw, Edit2, Lock } from 'lucide-react';

const ROLES = [
  { value: 'MASTER_ADMIN', label: 'Master Admin (Full System Access)' },
  { value: 'ADMIN', label: 'Admin (Operations & Reports)' },
  { value: 'MANAGER', label: 'Manager (Operational Records)' },
  { value: 'STAFF', label: 'Staff (Limited Operations)' },
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
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
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenCreate = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'STAFF',
      phone_number: '',
      location: locations[0]?.id || '',
      is_active: true,
      password: '',
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone_number: user.phone_number || '',
      location: user.location || '',
      is_active: user.is_active,
      password: '',
    });
    setEditUser(user);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editUser) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser.id}/`, payload);
        setEditUser(null);
      } else {
        await api.post('/users/', formData);
        setIsCreateOpen(false);
      }
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(s) ||
      u.first_name?.toLowerCase().includes(s) ||
      u.last_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  const columns = [
    {
      header: 'Name & Username',
      key: 'username',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100">
            {row.first_name || row.last_name ? `${row.first_name} ${row.last_name}` : row.username}
          </div>
          <div className="text-xs text-slate-400 font-mono">@{row.username}</div>
        </div>
      ),
    },
    {
      header: 'Email & Contact',
      key: 'email',
      render: (row) => (
        <div>
          <div className="text-xs text-slate-200">{row.email || '—'}</div>
          {row.phone_number && <div className="text-[11px] text-slate-400">{row.phone_number}</div>}
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      key: 'role',
      render: (row) => {
        const variant =
          row.role === 'MASTER_ADMIN'
            ? 'primary'
            : row.role === 'ADMIN'
            ? 'warning'
            : row.role === 'MANAGER'
            ? 'info'
            : 'secondary';
        return <Badge variant={variant}>{ROLE_LABELS[row.role] || row.role}</Badge>;
      },
    },
    {
      header: 'Home Location',
      key: 'location_details',
      render: (row) => <span className="text-xs text-slate-300">{row.location_details?.name || 'All Branches'}</span>,
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
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(row)} icon={Edit2}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            User Accounts & Roles
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage staff credentials, assigned locations, and system access levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadUsers} icon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={Plus}>
            New User
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, username, or email..."
          className="flex-1 max-w-md"
        />
        <span className="text-xs text-slate-400 font-medium">{filteredUsers.length} Users Total</span>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyTitle="No users found"
        emptyDescription="Add staff and administrators to manage permissions."
      />

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen || !!editUser}
        onClose={() => {
          setIsCreateOpen(false);
          setEditUser(null);
        }}
        title={editUser ? `Edit User: ${editUser.username}` : 'Create New User Account'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="Username"
            required
            disabled={!!editUser}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="e.g. maria.santos"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />

            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <Input
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g. staff@alaalafuneralhomes.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="System Role"
              required
              options={ROLES}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />

            <Select
              label="Assigned Location"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <Input
            label={editUser ? 'New Password (Leave blank to keep current)' : 'Account Password'}
            type="password"
            required={!editUser}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Min 6 characters"
          />

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
            <Button type="submit" variant="primary" loading={formLoading}>
              {editUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
