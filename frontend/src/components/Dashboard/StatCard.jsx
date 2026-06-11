// ─────────────────────────────────────────────────────────────
// src/components/Dashboard/StatCard.jsx
// Single metric card — animates on value change
//
// Displays: icon, big number, percentage, denominator, timestamp
// Pulses when the value updates via WebSocket.
// ─────────────────────────────────────────────────────────────

import { memo, useState, useEffect, useRef } from 'react';
import { calcRate, timeAgo } from '../../utils/calculations';

/**
 * @param {Object} props
 * @param {string} props.icon - Emoji icon
 * @param {string} props.label - "Delivered", "Opened", etc.
 * @param {number} props.value - Current count
 * @param {number} props.denominator - Total to calculate percentage from
 * @param {string} props.denominatorLabel - "sent", "delivered", etc.
 * @param {string} props.accentColor - CSS color for the top bar
 * @param {string} props.cardClass - CSS class for accent styling
 * @param {string|null} props.lastUpdate - ISO timestamp
 */
function StatCard({
  icon,
  label,
  value,
  denominator,
  denominatorLabel,
  accentColor,
  cardClass,
  lastUpdate,
}) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const [tick, setTick] = useState(0);

  // ── Animate on value change ─────────────────────────────
  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsPulsing(true);

      // Animate counting up from old value to new value
      const oldVal = prevValueRef.current;
      const diff = value - oldVal;
      const steps = Math.min(Math.abs(diff), 10);
      const stepDuration = 250 / Math.max(steps, 1);

      let step = 0;
      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        setDisplayValue(Math.round(oldVal + diff * progress));
        if (step >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, stepDuration);

      prevValueRef.current = value;

      const pulseTimer = setTimeout(() => setIsPulsing(false), 600);
      return () => {
        clearInterval(interval);
        clearTimeout(pulseTimer);
      };
    }
  }, [value]);

  // ── Tick the "time ago" display every second ────────────
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const rate = calcRate(value, denominator);

  return (
    <div className={`stat-card ${cardClass} ${isPulsing ? 'pulse' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color: value > 0 ? accentColor : undefined }}>
        {displayValue}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-rate" style={{ color: accentColor }}>
        {rate}%
      </div>
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        marginTop: 4,
      }}>
        {value > 0 ? `${value} of ${denominator} ${denominatorLabel}` : `0 of ${denominator}`}
      </div>
      {lastUpdate && (
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          marginTop: 2,
          opacity: 0.7,
        }}>
          {timeAgo(lastUpdate)}
        </div>
      )}
    </div>
  );
}

export default memo(StatCard);
