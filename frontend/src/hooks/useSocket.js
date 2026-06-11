// ─────────────────────────────────────────────────────────────
// src/hooks/useSocket.js
// WebSocket hook — connects to Socket.io for live stats updates
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Manages a Socket.io connection and listens for campaign stats updates.
 *
 * Usage:
 *   const { stats, isConnected } = useSocket(campaignId);
 */
export default function useSocket(campaignId) {
  const [stats, setStats] = useState({
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    total_failed: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to the CRM backend Socket.io server
    // In dev, Vite proxies /socket.io to localhost:3000
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket.id);
      setIsConnected(true);

      // Join campaign-specific room if we have a campaignId
      if (campaignId) {
        socket.emit('join_campaign', campaignId);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    // Listen for real-time stats updates
    socket.on('stats_update', (data) => {
      // Only update if this event is for our campaign
      if (!campaignId || data.campaign_id === campaignId) {
        setStats(prev => ({
          ...prev,
          ...data.stats,
        }));
        setLastUpdate(data.timestamp);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [campaignId]);

  // Join a new campaign room when campaignId changes
  useEffect(() => {
    if (socketRef.current && campaignId && isConnected) {
      socketRef.current.emit('join_campaign', campaignId);
    }
  }, [campaignId, isConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return { stats, isConnected, lastUpdate, disconnect };
}
