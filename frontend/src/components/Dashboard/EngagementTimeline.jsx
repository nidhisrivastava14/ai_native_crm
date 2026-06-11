// ─────────────────────────────────────────────────────────────
// src/components/Dashboard/EngagementTimeline.jsx
// Visual funnel — animated bars showing the delivery cascade
//
//   Sent       ████████████████████████ 100%
//   Delivered  ███████████████████░░░░░ 95.7%
//   Opened     ██████████░░░░░░░░░░░░░ 38.3%
//   Clicked    █░░░░░░░░░░░░░░░░░░░░░░ 6.4%
// ─────────────────────────────────────────────────────────────

import { calcRate } from '../../utils/calculations';

const STAGES = [
  { key: 'total_sent',      label: 'Sent',      color: 'var(--blue-500)',   emoji: '📨' },
  { key: 'total_delivered',  label: 'Delivered',  color: 'var(--green-500)',  emoji: '📱' },
  { key: 'total_opened',    label: 'Opened',     color: 'var(--purple-500)', emoji: '👀' },
  { key: 'total_clicked',   label: 'Clicked',    color: 'var(--orange-500)', emoji: '🖱️' },
];

/**
 * @param {Object} props
 * @param {Object} props.stats - { total_sent, total_delivered, total_opened, total_clicked }
 * @param {number} props.totalCustomers - Total customers in campaign
 */
export default function EngagementTimeline({ stats, totalCustomers }) {
  // Base denominator is totalCustomers (the 100% baseline)
  const maxVal = Math.max(totalCustomers, stats.total_sent || 0, 1);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 'var(--font-sm)',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 14,
      }}>
        📊 Engagement Funnel
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STAGES.map(({ key, label, color, emoji }) => {
          const value = stats[key] || 0;
          const pct = calcRate(value, maxVal);
          const barWidth = maxVal > 0 ? (value / maxVal) * 100 : 0;

          return (
            <div key={key}>
              {/* Label row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 'var(--font-xs)',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}>
                  {emoji} {label}
                </span>
                <span style={{
                  fontSize: 'var(--font-xs)',
                  fontWeight: 600,
                  color,
                }}>
                  {value} ({pct}%)
                </span>
              </div>

              {/* Bar */}
              <div style={{
                width: '100%',
                height: 8,
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  height: '100%',
                  width: `${barWidth}%`,
                  background: color,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: value > 0 ? `0 0 8px ${color}40` : 'none',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop-off labels */}
      {stats.total_sent > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 12,
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
        }}>
          <span>
            {stats.total_failed > 0
              ? `⚠️ ${stats.total_failed} failed`
              : '✓ No failures'
            }
          </span>
          <span>
            {stats.total_delivered > 0
              ? `${calcRate(stats.total_opened, stats.total_delivered)}% of delivered opened`
              : 'Waiting for delivery...'
            }
          </span>
        </div>
      )}
    </div>
  );
}
