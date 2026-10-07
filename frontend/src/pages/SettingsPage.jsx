import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { Building2, Layers, Server, Trash2, Plus, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, isMasterAdmin, isAdmin } = useAuth();
  const { isWsConnected } = useRealtime();

  // Locations & Categories
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Categorize locations: Chapels vs Office vs Service / Laundry
  const viewingChapels = locations.filter((l) => ['C2', 'C3', 'NC2', 'NC3'].includes(l.code));
  const officeDepots = locations.filter((l) => ['OFFICE'].includes(l.code));
  const serviceAndTags = locations.filter((l) => ['SERVICES', 'NO_CODE', 'NO CODE'].includes(l.code) || l.name === 'SERVICES' || l.name === 'NO CODE');
  const otherLocations = locations.filter(
    (l) =>
      !viewingChapels.some((c) => c.id === l.id) &&
      !officeDepots.some((c) => c.id === l.id) &&
      !serviceAndTags.some((c) => c.id === l.id)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-black-100 tracking-wide">
          System Settings & Facilities
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure viewing chapels, service departments, uncoded laundry tags, and inventory classifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operational Locations, Chapels & Service Departments */}
        <Card
          title="Chapels & Service Departments"
          subtitle="Physical viewing chapels vs. operational service departments and monitoring tags."
          action={
            isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setIsLocModalOpen(true)} icon={Plus}>
                Add Facility
              </Button>
            )
          }
        >
          <div className="space-y-4">
            {/* 1. Viewing Chapels */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 block mb-2">
                Viewing Chapels (Physical Rooms)
              </span>
              <div className="space-y-2">
                {viewingChapels.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 bg-[#F0F2F5]/60 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-sm">{loc.name}</span>
                        <Badge variant="primary" size="sm">Chapel</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{loc.description || 'Viewing facility'}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">#{loc.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Administrative Offices */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                Administrative Facilities
              </span>
              <div className="space-y-2">
                {officeDepots.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 bg-[#F0F2F5]/60 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-sm">{loc.name}</span>
                        <Badge variant="secondary" size="sm">Office Depot</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{loc.description || 'Administrative headquarters'}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">#{loc.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Operational & Service Units (NOT Chapels) */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 block mb-2">
                Service Units & Monitoring Tags (Non-Chapel)
              </span>
              <div className="space-y-2">
                {serviceAndTags.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 bg-[#F0F2F5]/60 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-sm">{loc.name}</span>
                        {loc.name === 'SERVICES' ? (
                          <Badge variant="info" size="sm">Service Dept (Non-Chapel)</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Laundry Tag (Non-Chapel)</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {loc.name === 'SERVICES'
                          ? 'Preparation, embalming, and funeral service operations (not a viewing chapel).'
                          : 'Laundry monitoring tag for uncoded linen, rags, and general fabrics.'}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">#{loc.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Other / Custom facilities */}
            {otherLocations.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Other Locations
                </span>
                <div className="space-y-2">
                  {otherLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3 bg-[#F0F2F5]/60 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-100 text-sm">{loc.name}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{loc.description}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500">#{loc.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Inventory Categories & System Architecture */}
        <div className="space-y-6">
          {/* Inventory Categories */}
          <Card
            title="Inventory Categories"
            subtitle="Operational product groupings for stock management"
            action={
              isAdmin && (
                <Button variant="secondary" size="sm" onClick={() => setIsCatModalOpen(true)} icon={Plus}>
                  Add Category
                </Button>
              )
            }
          >
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 bg-[#F0F2F5]/60 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-100 text-sm">{cat.name}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.description || 'General category'}</p>
                  </div>
                  <span className="text-xs text-slate-500">{cat.items_count || 0} items</span>
                </div>
              ))}
            </div>
          </Card>

          {/* System & Deployment Architecture Status */}
          <Card title="Deployment & Architecture Status" subtitle="Vercel Frontend & Django Backend">
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#F0F2F5]/60 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Frontend Deployment:</span>
                  <span className="font-semibold text-slate-700">Vercel (React + Vite)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Backend API URL:</span>
                  <span className="font-mono text-slate-600 text-[11px] truncate max-w-[200px]" title={api.baseUrl}>
                    {api.baseUrl}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Realtime Stream:</span>
                  <Badge variant={isWsConnected ? 'success' : 'info'} size="sm">
                    {isWsConnected ? 'Active (WebSocket)' : 'Active (Polling Fallback)'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Database Engine:</span>
                  <span className="font-semibold text-slate-700">PostgreSQL (Production) / SQLite (Dev)</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Account security & user permission controls have been relocated directly to the Dashboard.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Location Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Add Facility / Tag"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <Input
            label="Facility / Tag Name"
            placeholder="e.g. C4 (Chapel 4) or Staging"
            required
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
          />
          <Input
            label="Code Slug"
            placeholder="e.g. C4"
            required
            value={locCode}
            onChange={(e) => setLocCode(e.target.value)}
          />
          <Input
            label="Description"
            placeholder="Specify if viewing chapel, office, or service tag..."
            value={locDesc}
            onChange={(e) => setLocDesc(e.target.value)}
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="ghost" onClick={() => setIsLocModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Facility</Button>
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
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="ghost" onClick={() => setIsCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
