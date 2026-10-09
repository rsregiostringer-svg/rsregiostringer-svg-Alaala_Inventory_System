/**
 * Centralized API client for Alaala Funeral Homes Management System.
 * Configures base URL from VITE_API_URL and handles:
 * - JWT authentication headers
 * - Token refreshing
 * - Standardized errors and friendly error messages
 * - Network timeouts
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.cache = new Map();
    this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  clearCache(endpointPrefix = null) {
    if (!endpointPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(endpointPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  getTokens() {
    return {
      access: localStorage.getItem('alaala_access_token'),
      refresh: localStorage.getItem('alaala_refresh_token'),
    };
  }

  setTokens(access, refresh) {
    if (access) localStorage.setItem('alaala_access_token', access);
    if (refresh) localStorage.setItem('alaala_refresh_token', refresh);
  }

  clearTokens() {
    localStorage.removeItem('alaala_access_token');
    localStorage.removeItem('alaala_refresh_token');
    localStorage.removeItem('alaala_user');
  }

  onRefreshed(token) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  subscribeTokenRefresh(callback) {
    this.refreshSubscribers.push(callback);
  }

  async refreshToken() {
    const { refresh } = this.getTokens();
    if (!refresh) {
      this.clearTokens();
      throw new Error('Session expired. Please log in again.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        this.clearTokens();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json();
      this.setTokens(data.access, data.refresh || refresh);
      return data.access;
    } catch (err) {
      this.clearTokens();
      throw err;
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers = options.headers ? { ...options.headers } : {};
    const { access } = this.getTokens();

    if (access && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${access}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      let response = await fetch(url, { ...options, headers });

      // If token expired, attempt refresh once
      if (response.status === 401 && access && !options._retry) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const newAccess = await this.refreshToken();
            this.isRefreshing = false;
            this.onRefreshed(newAccess);
          } catch (refreshErr) {
            this.isRefreshing = false;
            window.dispatchEvent(new CustomEvent('auth:expired'));
            throw refreshErr;
          }
        }

        // Wait for new token
        const retryToken = await new Promise((resolve) => {
          this.subscribeTokenRefresh((token) => resolve(token));
        });

        headers['Authorization'] = `Bearer ${retryToken}`;
        return this.request(endpoint, { ...options, headers, _retry: true });
      }

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText || 'An unexpected error occurred.' };
        }

        const message =
          errorData.detail ||
          errorData.message ||
          (typeof errorData === 'object' ? Object.values(errorData).flat().join(' ') : null) ||
          `Request failed with status ${response.status}`;

        const err = new Error(message);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Unable to connect to Alaala backend service.');
      }
      throw error;
    }
  }

  get(endpoint, params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    const useCache = options.cache === true;
    
    if (useCache) {
      const cached = this.cache.get(fullEndpoint);
      if (cached && Date.now() - cached.timestamp < (options.ttl || this.defaultCacheTTL)) {
        return Promise.resolve(cached.data);
      }
    }

    return this.request(fullEndpoint, { method: 'GET', ...options }).then((data) => {
      if (useCache) {
        this.cache.set(fullEndpoint, { data, timestamp: Date.now() });
      }
      return data;
    });
  }

  post(endpoint, data) {
    this.clearCache();
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, data) {
    this.clearCache();
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { method: 'PUT', body });
  }

  patch(endpoint, data) {
    this.clearCache();
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { method: 'PATCH', body });
  }

  delete(endpoint) {
    this.clearCache();
    return this.request(endpoint, { method: 'DELETE' });
  }

  upload(endpoint, formData) {
    this.clearCache();
    return this.request(endpoint, { method: 'POST', body: formData });
  }
}

export const api = new ApiService();
export default api;
