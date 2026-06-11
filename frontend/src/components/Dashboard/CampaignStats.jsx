// ─────────────────────────────────────────────────────────────
// src/components/Dashboard/CampaignStats.jsx
// Real-time campaign performance dashboard
// Receives stats via WebSocket and animates counter updates
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

const STAT_CONFIG = [
  { key: 'total_sent',      label: 'Sent',      icon: '📨', cardClass: 'sent' },
  { key: 'total_delivered',  label: 'Delivered',  icon: '📱', cardClass: 'delivered' },
  { key: 'total_opened',    label: 'Opened',     icon: '👀', cardClass: 'opened' },
  { key: 'total_clicked',   label: 'Clicked',    icon: '🖱️', cardClass: 'clicked' },
];

/**
 * @param {Object} props
 * @param {Object} props.stats - { total_sent, total_delivered, total_opened, total_clicked }
 * @param {boolean} props.isConnected - WebSocket connection status
 * @param {string|null} props.lastUpdate - ISO timestamp of last update
 * @param {number} props.totalCustomers - Total customers in the campaign
 * @param {string} props.segmentName - Campaign segment name
 * @param {Function} props.onNewCampaign - Start a new campaign
 */
export default function CampaignStats({
  stats,
  isConnected,
  lastUpdate,
  totalCustomers,
  segmentName,
  onNewCampaign,
}) {
  // Track which stats just changed for pulse animation
  const prevStatsRef = useRef(stats);
  const [pulsingCards, setPulsingCards] = useState({});

  useEffect(() => {
    const prev = prevStatsRef.current;
    const newPulses = {};

    STAT_CONFIG.forEach(({ key }) => {
      if (stats[key] !== prev[key]) {
        newPulses[key] = true;
      }
    });

    if (Object.keys(newPulses).length > 0) {
      setPulsingCards(newPulses);
      const timer = setTimeout(() => setPulsingCards({}), 600);
      prevStatsRef.current = stats;
      return () => clearTimeout(timer);
    }

    prevStatsRef.current = stats;
  }, [stats]);

  // Calculate delivery progress
  const deliveryProgress = totalCustomers > 0
    ? ((stats.total_delivered + (stats.total_failed || 0)) / totalCustomers) * 100
    : 0;

  return (
    <div className="stats-dashboard">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="stats-title">📊 Campaign Performance</div>
        <div className="stats-live-badge">
          {isConnected ? (
            <>
              <span className="stats-live-dot" />
              Live
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>● Disconnected</span>
          )}
        </div>
      </div>

      <div className="stats-subtitle">
        {segmentName} · {totalCustomers} customers
      </div>

      {/* Delivery progress bar */}
      <div className="stats-progress">
        <div
          className="stats-progress-bar"
          style={{ width: `${Math.min(deliveryProgress, 100)}%` }}
        />
      </div>

      {/* Stat cards grid */}
      <div className="stats-grid">
        {STAT_CONFIG.map(({ key, label, icon, cardClass }) => {
          const value = stats[key] || 0;
          const rate = totalCustomers > 0
            ? ((value / totalCustomers) * 100).toFixed(1)
            : '0.0';

          return (
            <div
              key={key}
              className={`stat-card ${cardClass} ${pulsingCards[key] ? 'pulse' : ''}`}
            >
              <div className="stat-icon">{icon}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
              <div className="stat-rate">{rate}%</div>
            </div>
          );
        })}
      </div>

      {/* Last update timestamp */}
      {lastUpdate && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
          Last update: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}

      {/* New campaign button */}
      <div className="action-area" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={onNewCampaign}>
          ↻ Start New Campaign
        </button>
      </div>
    </div>
  );
}
