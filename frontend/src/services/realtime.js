/**
 * Realtime Service for Alaala Funeral Homes.
 * Connects to Django Channels WebSocket using VITE_WS_URL,
 * with automatic reconnection, heartbeat ping, and event dispatching.
 */

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

class RealtimeService {
  constructor() {
    this.wsUrl = WS_BASE_URL.endsWith('/') ? `${WS_BASE_URL}realtime/` : `${WS_BASE_URL}/realtime/`;
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimeout = null;
    this.pingInterval = null;
    this.isConnected = false;
    this.onStatusChangeCallbacks = new Set();
  }

  onStatusChange(callback) {
    this.onStatusChangeCallbacks.add(callback);
    callback(this.isConnected);
    return () => this.onStatusChangeCallbacks.delete(callback);
  }

  notifyStatus(connected) {
    this.isConnected = connected;
    this.onStatusChangeCallbacks.forEach((cb) => cb(connected));
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyStatus(true);
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleEvent(message.type, message.data || message);
        } catch (err) {
          console.warn('[Realtime] Failed to parse message:', err);
        }
      };

      this.socket.onclose = () => {
        this.notifyStatus(false);
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.notifyStatus(false);
      };
    } catch (err) {
      this.notifyStatus(false);
      this.scheduleReconnect();
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: 'ping' }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 20000);
      this.reconnectAttempts++;
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      if (this.listeners.has(eventType)) {
        this.listeners.get(eventType).delete(callback);
      }
    };
  }

  handleEvent(type, data) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[Realtime] Listener error on '${type}':`, e);
        }
      });
    }

    // Trigger universal listener
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach((cb) => cb(type, data));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifyStatus(false);
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
