import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { realtimeService } from '../services/realtime';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [pollTick, setPollTick] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      realtimeService.connect();
      const unsub = realtimeService.onStatusChange((connected) => {
        setIsWsConnected(connected);
      });
      return () => {
        unsub();
        realtimeService.disconnect();
      };
    } else {
      realtimeService.disconnect();
      setIsWsConnected(false);
    }
  }, [isAuthenticated]);

  // Fallback Polling Mechanism:
  // If WebSocket is not connected (e.g. Vercel deployment without WebSocket access or network drop),
  // fire pollTick every 20 seconds to prompt pages to refresh active data seamlessly.
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalTime = isWsConnected ? 60000 : 20000; // 20s fallback, 60s backup sync
    const timer = setInterval(() => {
      setPollTick((prev) => prev + 1);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isAuthenticated, isWsConnected]);

  const subscribe = useCallback((eventType, callback) => {
    return realtimeService.subscribe(eventType, callback);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isWsConnected,
        pollTick,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
