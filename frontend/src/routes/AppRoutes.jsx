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
import MaintenancePage from '../pages/MaintenancePage';
import WaterPage from '../pages/WaterPage';
import ElectricityPage from '../pages/ElectricityPage';
import ReportsPage from '../pages/ReportsPage';
import UsersPage from '../pages/UsersPage';
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
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="water" element={<WaterPage />} />
        <Route path="electricity" element={<ElectricityPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute adminOnly>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute adminOnly>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
