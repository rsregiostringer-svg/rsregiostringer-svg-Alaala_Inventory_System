import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import TransactModal from '../components/inventory/TransactModal';
import { formatCurrency, INVENTORY_STATUS_MAP } from '../utils/formatters';
import { Plus, ArrowLeftRight, Edit2, Filter, RefreshCw } from 'lucide-react';

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');

  // Modals
  const [transactItem, setTransactItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    location: '',
    description: '',
    unit: 'pcs',
    current_quantity: 0,
    minimum_stock: 5,
    maximum_stock: 100,
    supplier: '',
    cost: '0.00',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { pollTick, subscribe } = useRealtime();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [itemsRes, catRes, locRes] = await Promise.all([
        api.get('/inventory/items/', {
          search,
          location: selectedLocation,
          category: selectedCategory,
          status: selectedStatus,
        }),
        api.get('/categories/'),
        api.get('/locations/'),
      ]);

      const itemsList = itemsRes.results || itemsRes;
      setItems(itemsList);
      setCategories(catRes.results || catRes);
      setLocations(locRes.results || locRes);
    } catch (err) {
      setError(err.message || 'Unable to load inventory records.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedLocation, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData, pollTick]);

  useEffect(() => {
    const unsub = subscribe('inventory.updated', () => loadData());
    return () => unsub();
  }, [subscribe, loadData]);

  // Update query params when filters change
  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams);

    if (key === 'location') setSelectedLocation(value);
    if (key === 'category') setSelectedCategory(value);
    if (key === 'status') setSelectedStatus(value);
  };

  const handleOpenCreate = () => {
    setFormData({
      item_name: '',
      category: categories[0]?.id || '',
      location: locations[0]?.id || '',
      description: '',
      unit: 'pcs',
      current_quantity: 0,
      minimum_stock: 5,
      maximum_stock: 100,
      supplier: '',
      cost: '0.00',
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      item_name: item.item_name,
      category: item.category,
      location: item.location,
      description: item.description,
      unit: item.unit,
      current_quantity: item.current_quantity,
      minimum_stock: item.minimum_stock,
      maximum_stock: item.maximum_stock,
      supplier: item.supplier,
      cost: item.cost,
    });
    setEditItem(item);
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editItem) {
        await api.put(`/inventory/items/${editItem.id}/`, formData);
        setEditItem(null);
      } else {
        await api.post('/inventory/items/', formData);
        setIsCreateOpen(false);
      }
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to save inventory item.');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Item Name & Details',
      key: 'item_name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100">{row.item_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {row.category_name} &bull; {row.supplier || 'Standard Supplier'}
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      key: 'location_details',
      render: (row) => (
        <span className="font-medium text-slate-200">
          {row.location_details?.name || '—'}
        </span>
      ),
    },
    {
      header: 'Stock Quantity',
      key: 'current_quantity',
      render: (row) => (
        <div>
          <div className="font-bold text-amber-400 text-sm">
            {row.current_quantity} <span className="text-xs font-normal text-slate-400">{row.unit}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Min: {row.minimum_stock} | Max: {row.maximum_stock}
          </div>
        </div>
      ),
    },
    {
      header: 'Unit Cost & Value',
      key: 'cost',
      render: (row) => {
        const totalVal = row.current_quantity * parseFloat(row.cost || 0);
        return (
          <div>
            <div className="text-xs font-medium text-slate-200">{formatCurrency(row.cost)}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              Total: {formatCurrency(totalVal)}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const meta = INVENTORY_STATUS_MAP[row.status] || { label: row.status, variant: 'neutral' };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setTransactItem(row);
            }}
            icon={ArrowLeftRight}
          >
            Move
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Edit Details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
            General Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage stock, monitor minimum thresholds, and record multi-branch movements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} icon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={Plus}>
            New Item
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            handleFilterChange('search', val);
          }}
          placeholder="Search by name, description, supplier..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-40">
            <Select
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="All Locations"
              value={selectedLocation}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>

          <div className="w-40">
            <Select
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="All Categories"
              value={selectedCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            />
          </div>

          <div className="w-36">
            <Select
              options={[
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'LOW_STOCK', label: 'Low Stock' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
              ]}
              placeholder="All Status"
              value={selectedStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyTitle="No inventory items found"
        emptyDescription="Try adjusting your filters or add a new inventory item."
        emptyActionLabel="Add Inventory Item"
        onEmptyAction={handleOpenCreate}
      />

      {/* Movement / Transaction Modal */}
      <TransactModal
        isOpen={!!transactItem}
        onClose={() => setTransactItem(null)}
        item={transactItem}
        locations={locations}
        onSuccess={() => loadData()}
      />

      {/* Create / Edit Item Modal */}
      <Modal
        isOpen={isCreateOpen || !!editItem}
        onClose={() => {
          setIsCreateOpen(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="Item Name"
            required
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            placeholder="e.g. White Satin Towels"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              required
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />

            <Select
              label="Location"
              required
              disabled={!!editItem}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              helperText={editItem ? 'Location transfers must use Stock Movement' : ''}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Current Quantity"
              type="number"
              min="0"
              required
              value={formData.current_quantity}
              onChange={(e) => setFormData({ ...formData, current_quantity: parseInt(e.target.value, 10) || 0 })}
            />

            <Input
              label="Unit of Measure"
              placeholder="e.g. pcs, sets, rolls"
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />

            <Input
              label="Unit Cost (₱)"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum Safety Stock"
              type="number"
              min="0"
              required
              value={formData.minimum_stock}
              onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value, 10) || 0 })}
              helperText="Status triggers 'Low Stock' below this"
            />

            <Input
              label="Maximum Stock"
              type="number"
              min="0"
              value={formData.maximum_stock}
              onChange={(e) => setFormData({ ...formData, maximum_stock: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          <Input
            label="Supplier / Vendor"
            placeholder="e.g. Manila Textile Corp"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          />

          <Input
            label="Description / Specifications"
            placeholder="Additional details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setEditItem(null);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading}>
              {editItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
