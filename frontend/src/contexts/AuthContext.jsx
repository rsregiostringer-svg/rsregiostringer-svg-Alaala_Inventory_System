import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('alaala_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const { access } = api.getTokens();
    if (!access) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.get('/auth/me/');
      setUser(data);
      localStorage.setItem('alaala_user', JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to verify user session:', err);
      api.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthExpired = () => {
      setUser(null);
      api.clearTokens();
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [fetchCurrentUser]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password });
    api.setTokens(res.access, res.refresh);
    setUser(res.user);
    localStorage.setItem('alaala_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('alaala_user', JSON.stringify(updatedUser));
  };

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const isSimpleAdmin = user?.role === 'ADMIN' && !isMasterAdmin;
  const isStaffRole = user?.role === 'STAFF';
  const isAdmin = isMasterAdmin || user?.role === 'ADMIN';
  const isManager = isMasterAdmin || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isStaff = !!user;

  const canAccessWater = isMasterAdmin || isSimpleAdmin || Boolean(user?.custom_permissions?.water);
  const canAccessElectricity = isMasterAdmin || isSimpleAdmin || Boolean(user?.custom_permissions?.electricity);
  const canViewReports = isMasterAdmin || Boolean(user?.custom_permissions?.reports);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        fetchCurrentUser,
        isAuthenticated: !!user,
        isMasterAdmin,
        isSimpleAdmin,
        isStaffRole,
        isAdmin,
        isManager,
        isStaff,
        canAccessWater,
        canAccessElectricity,
        canViewReports,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
