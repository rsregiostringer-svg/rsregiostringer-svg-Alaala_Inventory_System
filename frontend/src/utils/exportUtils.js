import { api } from '../services/api';

/**
 * Utility to download CSV for different operations
 * @param {string} module - The backend module (inventory, transactions, caskets, etc.)
 * @param {object} params - Any filters like { location: 1, start_date: '2026-01-01' }
 * @param {string} filenamePrefix - Used to construct filename like `alaala_{filenamePrefix}_{date}.csv`
 */
export const handleExportExcel = async (module, params = {}, filenamePrefix = 'export') => {
  try {
    const searchParams = new URLSearchParams({
      module,
      ...params
    });

    // Remove empty params
    for (const [key, value] of Array.from(searchParams.entries())) {
      if (!value || value === 'null' || value === 'undefined') {
        searchParams.delete(key);
      }
    }

    const exportUrl = `${api.baseUrl}/reports/export-csv/?${searchParams.toString()}`;
    const token = localStorage.getItem('alaala_access_token');

    const res = await fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
        throw new Error('Export failed');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `alaala_${filenamePrefix}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error(`Failed to export ${module} CSV:`, err);
    throw err;
  }
};
