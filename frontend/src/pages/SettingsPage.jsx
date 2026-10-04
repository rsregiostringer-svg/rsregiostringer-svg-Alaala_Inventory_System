import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { Building2, Layers, KeyRound, Server, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { isWsConnected } = useRealtime();

  // Locations & Categories
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Password Change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // New Location Modal
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locDesc, setLocDesc] = useState('');

  // New Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        api.get('/locations/'),
        api.get('/categories/'),
      ]);
      setLocations(lRes.results || lRes);
      setCategories(cRes.results || cRes);
    } catch (err) {
      console.error('Error loading settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwSuccess('');
    setPwError('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }

    setPwLoading(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPwSuccess('Password successfully changed.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locations/', {
        name: locName.trim(),
        code: locCode.trim().toUpperCase().replace(/\s+/g, '_'),
        description: locDesc.trim(),
        is_active: true,
      });
      setIsLocModalOpen(false);
      setLocName('');
      setLocCode('');
      setLocDesc('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create location.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories/', {
        name: catName.trim(),
        description: catDesc.trim(),
        is_active: true,
      });
      setIsCatModalOpen(false);
      setCatName('');
      setCatDesc('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create category.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
          System Settings & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure physical facilities, inventory classification, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operational Locations */}
        <Card
          title="Operational Locations & Chapels"
          subtitle="Branches and storage zones (NO COE, SERVICES, C2, C3, NC2, NC3, OFFICE)"
          action={
            isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setIsLocModalOpen(true)}>
                + Add
              </Button>
            )
          }
        >
          <div className="space-y-2">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200">{loc.name}</span>
                    <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {loc.code}
                    </span>
                  </div>
                  {loc.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{loc.description}</p>
                  )}
                </div>
                <Badge variant={loc.is_active ? 'success' : 'danger'} size="sm">
                  {loc.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Categories */}
        <Card
          title="Inventory Categories"
          subtitle="Classify linens, funeral supplies, equipment, and chemicals"
          action={
            isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setIsCatModalOpen(true)}>
                + Add
              </Button>
            )
          }
        >
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-xs text-slate-200">{cat.name}</span>
                  {cat.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400">{cat.items_count || 0} items</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Security & Password */}
        <Card title="Account Security" subtitle="Update your account login password">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {pwSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{pwSuccess}</span>
              </div>
            )}
            {pwError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{pwError}</span>
              </div>
            )}

            <Input
              type="password"
              label="Current Password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <Input
              type="password"
              label="New Password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              type="password"
              label="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={pwLoading} className="w-full">
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        {/* System & Deployment Architecture Info */}
        <Card title="Deployment & Architecture Status" subtitle="Vercel Frontend & Django Backend">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Frontend Deployment:</span>
                <span className="font-semibold text-slate-200">Vercel (React + Vite)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Backend API URL:</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]" title={api.baseUrl}>
                  {api.baseUrl}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Realtime Stream:</span>
                <Badge variant={isWsConnected ? 'success' : 'info'} size="sm">
                  {isWsConnected ? 'Active (WebSocket)' : 'Active (Polling Fallback)'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-semibold text-slate-200">PostgreSQL (Production) / SQLite (Dev)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              All client requests dynamically communicate through environment variables without hardcoded URLs.
            </p>
          </div>
        </Card>
      </div>

      {/* Add Location Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Add Location / Chapel Zone"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <Input
            label="Location Name"
            placeholder="e.g. C4 (Chapel 4)"
            required
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
          />
          <Input
            label="Location Code"
            placeholder="e.g. C4"
            required
            value={locCode}
            onChange={(e) => setLocCode(e.target.value)}
          />
          <Input
            label="Description"
            placeholder="Facility description..."
            value={locDesc}
            onChange={(e) => setLocDesc(e.target.value)}
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsLocModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Location</Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Add Inventory Category"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Floral Supplies"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
          <Input
            label="Description"
            placeholder="Category description..."
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
