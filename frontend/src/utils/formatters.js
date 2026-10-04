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

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
  AVAILABLE: { label: 'Available', variant: 'success' },
  LOW_STOCK: { label: 'Low Stock', variant: 'warning' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'danger' },
};

export const LAUNDRY_STATUS_MAP = {
  LAUNDRY_IN: { label: 'Laundry IN', variant: 'info' },
  FOR_LABA: { label: 'For Laba', variant: 'warning' },
  LABA: { label: 'Laba (Washing)', variant: 'primary' },
  FOR_BANLAW: { label: 'For Banlaw', variant: 'warning' },
  BANLAW: { label: 'Banlaw (Rinsing)', variant: 'primary' },
  FOR_SAMPAY: { label: 'For Sampay', variant: 'warning' },
  SAMPAY: { label: 'Sampay (Drying)', variant: 'primary' },
  FOR_PINAW: { label: 'For Pinaw', variant: 'warning' },
  PINAW: { label: 'Pinaw (Ironing)', variant: 'primary' },
  FOR_TIKLOP: { label: 'For Tiklop', variant: 'warning' },
  TIKLOP: { label: 'Tiklop (Folding)', variant: 'primary' },
  READY_FOR_RETURN: { label: 'Ready for Return', variant: 'accent' },
  RETURNED: { label: 'Returned', variant: 'success' },
};

export const CASKET_STATUS_MAP = {
  AVAILABLE: { label: 'Available', variant: 'success' },
  RESERVED: { label: 'Reserved', variant: 'warning' },
  SOLD: { label: 'Sold', variant: 'info' },
  USED: { label: 'Used in Service', variant: 'secondary' },
  FOR_REPAIR: { label: 'For Repair', variant: 'danger' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'danger' },
};

export const CASKET_CONDITION_MAP = {
  NEW: { label: 'Brand New', variant: 'success' },
  GOOD: { label: 'Good Condition', variant: 'info' },
  NEEDS_REPAIR: { label: 'Needs Repair', variant: 'warning' },
  DAMAGED: { label: 'Damaged', variant: 'danger' },
};

export const MAINTENANCE_STATUS_MAP = {
  REPORTED: { label: 'Reported', variant: 'warning' },
  PENDING: { label: 'Pending', variant: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

export const MAINTENANCE_PRIORITY_MAP = {
  LOW: { label: 'Low', variant: 'neutral' },
  MEDIUM: { label: 'Medium', variant: 'info' },
  HIGH: { label: 'High', variant: 'warning' },
  URGENT: { label: 'Urgent', variant: 'danger' },
};

export const PAYMENT_STATUS_MAP = {
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  UNPAID: { label: 'Unpaid', variant: 'danger' },
  OVERDUE: { label: 'Overdue', variant: 'danger' },
};

export const ROLE_LABELS = {
  MASTER_ADMIN: 'Master Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};
