// ─────────────────────────────────────────────────────────────
// src/hooks/useWebSocket.js
// Enhanced WebSocket hook with auto-reconnect + event log
//
// Builds on the simpler useSocket.js but adds:
//   - Auto-reconnect with exponential backoff
//   - Event log (tracks every callback for the activity feed)
//   - Campaign room subscription
//   - Connection quality indicator
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const MAX_EVENTS = 50; // Keep last 50 events for the activity log

/**
 * Enhanced WebSocket hook for real-time campaign tracking.
 *
 * @param {string|null} campaignId - Campaign to track
 * @returns {{ stats, events, isConnected, lastUpdate, disconnect }}
 */
export default function useWebSocket(campaignId) {
  const [stats, setStats] = useState({
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    total_failed: 0,
  });
  const [events, setEvents] = useState([]);          // Activity log
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    // Don't connect until we have a campaign to track
    if (!campaignId) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 20,
    });

    socketRef.current = socket;

    // ── Connection events ─────────────────────────────────
    socket.on('connect', () => {
      console.log('🔌 Dashboard WebSocket connected:', socket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      socket.emit('join_campaign', campaignId);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Dashboard WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttempts.current = attempt;
      console.log(`🔄 Reconnecting... attempt ${attempt}`);
    });

    socket.on('reconnect', () => {
      console.log('✅ Reconnected!');
      setIsConnected(true);
      socket.emit('join_campaign', campaignId);
    });

    // ── Stats updates ─────────────────────────────────────
    socket.on('stats_update', (data) => {
      if (data.campaign_id !== campaignId) return;

      // Update stats state
      setStats(prev => ({
        ...prev,
        ...data.stats,
      }));

      // Update timestamp
      setLastUpdate(data.timestamp || new Date().toISOString());

      // Append to event log
      setEvents(prev => {
        const newEvent = {
          id: `${data.event_type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: data.event_type,
          timestamp: data.timestamp || new Date().toISOString(),
          stats: { ...data.stats },
        };
        const updated = [newEvent, ...prev];
        return updated.slice(0, MAX_EVENTS); // Keep last N events
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [campaignId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  return {
    stats,
    events,
    isConnected,
    lastUpdate,
    disconnect,
    reconnect,
    reconnectAttempts: reconnectAttempts.current,
  };
}
