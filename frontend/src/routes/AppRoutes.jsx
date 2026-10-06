import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import InventoryPage from '../pages/InventoryPage';
import InventoryTransactionsPage from '../pages/InventoryTransactionsPage';
import LaundryPage from '../pages/LaundryPage';
import LaundryDetailPage from '../pages/LaundryDetailPage';
import CasketsPage from '../pages/CasketsPage';
import ChapelMonitoringPage from '../pages/ChapelMonitoringPage';
import MaintenancePage from '../pages/MaintenancePage';
import WaterPage from '../pages/WaterPage';
import ElectricityPage from '../pages/ElectricityPage';
import ReportsPage from '../pages/ReportsPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import UsersPage from '../pages/UsersPage';
import UserRolesPage from '../pages/UserRolesPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import SettingsPage from '../pages/SettingsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Operations Routes inside MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/transactions" element={<InventoryTransactionsPage />} />
        <Route path="laundry" element={<LaundryPage />} />
        <Route path="laundry/:id" element={<LaundryDetailPage />} />
        <Route path="caskets" element={<CasketsPage />} />
        <Route path="chapels" element={<ChapelMonitoringPage />} />
        <Route path="lamay" element={<Navigate to="/chapels" replace />} />
        <Route path="maintenance" element={<MaintenancePage />} />

        {/* Optional Utilities Routes (enforced by permissions) */}
        <Route
          path="water"
          element={
            <ProtectedRoute>
              <WaterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="electricity"
          element={
            <ProtectedRoute>
              <ElectricityPage />
            </ProtectedRoute>
          }
        />

        {/* Reports (Master Admin or custom report perm) */}
        <Route
          path="reports"
          element={
            <ProtectedRoute
              checkPermission={(u) =>
                u?.role === 'MASTER_ADMIN' || Boolean(u?.custom_permissions?.reports)
              }
            >
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Master Admin Only Routes: Users, Roles, Analytics, Audit Logs, Settings */}
        <Route
          path="users"
          element={
            <ProtectedRoute masterAdminOnly>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute masterAdminOnly>
              <UserRolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute masterAdminOnly>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute masterAdminOnly>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute masterAdminOnly>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
