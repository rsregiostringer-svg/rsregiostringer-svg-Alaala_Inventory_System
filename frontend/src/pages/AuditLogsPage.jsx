import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import { formatDateTime } from '../utils/formatters';
import { ShieldCheck, RefreshCw, Filter } from 'lucide-react';

const MODULES = [
  'INVENTORY', 'LAUNDRY', 'CASKETS', 'MAINTENANCE', 'WATER', 'ELECTRICITY', 'USERS', 'AUTH'
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs/', {
        search,
        module: selectedModule,
        action: selectedAction,
      });
      setLogs(res.results || res);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedModule, selectedAction]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      header: 'Personnel / User',
      key: 'user_repr',
      render: (row) => (
        <span className="font-medium text-slate-100 text-xs">
          {row.user_repr || 'System'}
        </span>
      ),
    },
    {
      header: 'Module',
      key: 'module',
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-600 border border-slate-300">
          {row.module}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => {
        const variant =
          row.action === 'CREATE'
            ? 'success'
            : row.action === 'DELETE'
            ? 'danger'
            : row.action === 'TRANSFER'
            ? 'primary'
            : row.action === 'STAGE_CHANGE'
            ? 'accent'
            : 'warning';
        return <Badge variant={variant} size="sm">{row.action}</Badge>;
      },
    },
    {
      header: 'Operational Description',
      key: 'description',
      render: (row) => (
        <div className="max-w-md">
          <p className="text-xs text-slate-700">{row.description}</p>
          {row.record_repr && (
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Ref: {row.record_repr}</p>
          )}
        </div>
      ),
    },
    {
      header: 'IP Address',
      key: 'ip_address',
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-500">
          {row.ip_address || 'Internal'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            Audit Trail & Accountability
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all operational adjustments, stage advances, transfers, and system events.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadLogs} icon={RefreshCw}>
          Refresh Logs
        </Button>
      </div>

      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by action, description, user..."
          className="flex-1 max-w-sm"
        />

        <div className="w-44">
          <Select
            options={MODULES.map((m) => ({ value: m, label: m }))}
            placeholder="All Modules"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
          />
        </div>

        <div className="w-40">
          <Select
            options={[
              { value: 'CREATE', label: 'Create' },
              { value: 'UPDATE', label: 'Update' },
              { value: 'TRANSFER', label: 'Transfer' },
              { value: 'STAGE_CHANGE', label: 'Stage Change' },
              { value: 'STATUS_CHANGE', label: 'Status Change' },
              { value: 'LOGIN', label: 'Login' },
            ]}
            placeholder="All Actions"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          />
        </div>

        {(selectedModule || selectedAction || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedModule('');
              setSelectedAction('');
              setSearch('');
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyTitle="No audit logs found"
        emptyDescription="System activities will automatically populate this audit journal."
      />
    </div>
  );
}
