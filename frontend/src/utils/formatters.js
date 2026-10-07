/**
 * Standard formatters and badge styling maps for Alaala Funeral Homes.
 */

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-PH').format(num);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${mm}/${dd}/${yyyy}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateTimeString;
  }
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  if (/am|pm/i.test(timeStr)) return timeStr.trim();
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return timeStr;
};

export const formatDateTimeDisplay = (dateStr, timeStr) => {
  if (!dateStr) return '—';
  const formattedDate = formatDate(dateStr);
  if (!timeStr) return formattedDate;
  return `${formattedDate} · ${formatTime(timeStr)}`;
};

export const INVENTORY_STATUS_MAP = {
  AVAILABLE: { label: 'Available', variant: 'blue' },
  LOW_STOCK: { label: 'Low Stock', variant: 'yellow' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'red' },
};

export const LAUNDRY_STATUS_MAP = {
  LAUNDRY_IN: { label: 'Laundry IN', variant: 'blue' },
  FOR_LABA: { label: 'For Laba', variant: 'yellow' },
  LABA: { label: 'Laba (Washing)', variant: 'blue' },
  FOR_BANLAW: { label: 'For Banlaw', variant: 'yellow' },
  BANLAW: { label: 'Banlaw (Rinsing)', variant: 'blue' },
  FOR_SAMPAY: { label: 'For Sampay', variant: 'yellow' },
  SAMPAY: { label: 'Sampay (Drying)', variant: 'blue' },
  FOR_PINAW: { label: 'For Pinaw', variant: 'yellow' },
  PINAW: { label: 'Pinaw (Ironing)', variant: 'blue' },
  FOR_TIKLOP: { label: 'For Tiklop', variant: 'yellow' },
  TIKLOP: { label: 'Tiklop (Folding)', variant: 'blue' },
  READY_FOR_RETURN: { label: 'Ready for Return', variant: 'blue' },
  RETURNED: { label: 'Returned', variant: 'neutral' },
};

export const CASKET_STATUS_MAP = {
  AVAILABLE: { label: 'Available', variant: 'blue' },
  RESERVED: { label: 'Reserved', variant: 'yellow' },
  SOLD: { label: 'Sold', variant: 'blue' },
  USED: { label: 'Used in Service', variant: 'neutral' },
  FOR_REPAIR: { label: 'For Repair', variant: 'red' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'red' },
};

export const CASKET_CONDITION_MAP = {
  NEW: { label: 'Brand New', variant: 'blue' },
  GOOD: { label: 'Good Condition', variant: 'blue' },
  NEEDS_REPAIR: { label: 'Needs Repair', variant: 'yellow' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
};

export const MAINTENANCE_STATUS_MAP = {
  REPORTED: { label: 'Reported', variant: 'yellow' },
  PENDING: { label: 'Pending', variant: 'yellow' },
  FOR_REPAIR: { label: 'For Repair', variant: 'red' },
  IN_PROGRESS: { label: 'In Progress', variant: 'blue' },
  COMPLETED: { label: 'Completed', variant: 'blue' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

export const MAINTENANCE_PRIORITY_MAP = {
  LOW: { label: 'Low', variant: 'neutral' },
  MEDIUM: { label: 'Medium', variant: 'blue' },
  HIGH: { label: 'High', variant: 'yellow' },
  URGENT: { label: 'Urgent', variant: 'red' },
};

export const PAYMENT_STATUS_MAP = {
  PAID: { label: 'Paid', variant: 'blue' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'yellow' },
  UNPAID: { label: 'Unpaid', variant: 'red' },
  OVERDUE: { label: 'Overdue', variant: 'red' },
};

export const ROLE_LABELS = {
  MASTER_ADMIN: 'Master Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

export const CHAPEL_STATUS_MAP = {
  AVAILABLE: { label: 'Available', variant: 'blue', bgClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  OCCUPIED: { label: 'Occupied / Lamay', variant: 'red', bgClass: 'bg-red-50 text-red-700 border-red-200' },
  RESERVED: { label: 'Reserved', variant: 'yellow', bgClass: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  CLEANING: { label: 'Cleaning', variant: 'blue', bgClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  MAINTENANCE: { label: 'Maintenance', variant: 'yellow', bgClass: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  OUT_OF_SERVICE: { label: 'Out of Service', variant: 'neutral', bgClass: 'bg-slate-100 text-slate-700 border-slate-300' },
};

export const LAMAY_STATUS_MAP = {
  RESERVED: { label: 'Reserved', variant: 'yellow' },
  PREPARING: { label: 'Preparing', variant: 'blue' },
  ACTIVE: { label: 'Active / Lamay', variant: 'blue' },
  FOR_BURIAL: { label: 'For Burial', variant: 'yellow' },
  COMPLETED: { label: 'Completed', variant: 'blue' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

