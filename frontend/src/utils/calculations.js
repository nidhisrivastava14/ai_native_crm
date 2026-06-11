// ─────────────────────────────────────────────────────────────
// src/utils/calculations.js
// Utility functions for stats formatting, percentages, and time
// ─────────────────────────────────────────────────────────────

/**
 * Calculates a percentage with one decimal place.
 * Returns '0.0' if denominator is 0.
 */
export function calcRate(numerator, denominator) {
  if (!denominator || denominator === 0) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

/**
 * Formats a number with Indian-style commas (12,400).
 */
export function formatNumber(n) {
  return (n || 0).toLocaleString('en-IN');
}

/**
 * Formats a currency value as ₹X,XXX.
 */
export function formatCurrency(amount) {
  return `₹${formatNumber(Math.round(amount || 0))}`;
}

/**
 * Returns a human-readable "time ago" string.
 *   < 5s  → "just now"
 *   < 60s → "Xs ago"
 *   < 60m → "Xm ago"
 *   else  → "Xh ago"
 */
export function timeAgo(dateOrString) {
  if (!dateOrString) return 'never';
  const date = typeof dateOrString === 'string' ? new Date(dateOrString) : dateOrString;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/**
 * Determines campaign status based on delivery progress.
 *   - "sending"  if some messages are still pending
 *   - "complete" if all messages have a terminal status
 */
export function getCampaignStatus(stats, totalCustomers) {
  const processed = (stats.total_delivered || 0) + (stats.total_failed || 0);
  if (totalCustomers > 0 && processed >= totalCustomers) return 'complete';
  return 'sending';
}

/**
 * Returns a health color based on delivery rate.
 *   > 50%  → green
 *   > 30%  → orange
 *   else   → red
 */
export function getHealthColor(delivered, sent) {
  const rate = sent > 0 ? (delivered / sent) * 100 : 0;
  if (rate > 50) return 'var(--green-500)';
  if (rate > 30) return 'var(--orange-500)';
  return 'var(--red-500)';
}
