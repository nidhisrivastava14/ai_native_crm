// ─────────────────────────────────────────────────────────────
// src/services/webhookService.js
// Webhook processing — updates messages + recalculates stats
//
// When the Channel Service delivers/opens/clicks a message,
// it calls our webhook. This service:
//   1. Validates the event
//   2. Checks idempotency (no double-counting)
//   3. Updates the message row (status + timestamp)
//   4. Recalculates campaign stats via COUNT aggregation
//   5. Returns fresh stats for WebSocket broadcast
//
// Everything runs inside a single DB transaction.
// ─────────────────────────────────────────────────────────────

const { pool } = require('./database');

// ── Valid event types ─────────────────────────────────────────
const VALID_EVENTS = ['sent', 'delivered', 'opened', 'clicked', 'failed'];

// Status progression — a message should only move forward
// (e.g. "delivered" → "opened" is valid, "opened" → "sent" is not)
const STATUS_ORDER = {
  pending:   0,
  sent:      1,
  delivered: 2,
  opened:    3,
  clicked:   4,
  failed:    1, // same level as sent (terminal state)
};

// Map event_type → which timestamp column to set
const TIMESTAMP_COLUMNS = {
  sent:      'sent_at',
  delivered: 'delivered_at',
  opened:    'opened_at',
  clicked:   'clicked_at',
  failed:    'sent_at',
};

// ── Input validation ──────────────────────────────────────────

/**
 * Validates webhook payload from Channel Service.
 *
 * @param {Object} data - { campaign_id, customer_id, event_type, timestamp? }
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateWebhookInput(data) {
  const errors = [];

  if (!data.campaign_id) errors.push('campaign_id is required');
  if (!data.customer_id) errors.push('customer_id is required');

  if (!data.event_type) {
    errors.push('event_type is required');
  } else if (!VALID_EVENTS.includes(data.event_type)) {
    errors.push(`event_type must be one of: ${VALID_EVENTS.join(', ')}`);
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true };
}

// ── Update individual message ─────────────────────────────────

/**
 * Updates a single message record's status and timestamp.
 * Handles idempotency: if the message is already at this status
 * (or a later one), the update is skipped.
 *
 * @param {Object} client - PG client (inside transaction)
 * @param {string} campaignId
 * @param {string} customerId
 * @param {string} eventType - "sent" | "delivered" | "opened" | "clicked" | "failed"
 * @param {string} timestamp - ISO timestamp
 * @returns {{ updated: boolean, skipped: boolean, reason?: string }}
 */
async function updateMessageStatus(client, campaignId, customerId, eventType, timestamp) {
  // ── Check current status (idempotency) ──────────────────────
  const current = await client.query(
    `SELECT status FROM messages
     WHERE campaign_id = $1 AND customer_id = $2
     LIMIT 1`,
    [campaignId, customerId]
  );

  if (current.rows.length === 0) {
    return { updated: false, skipped: true, reason: 'Message record not found' };
  }

  const currentStatus = current.rows[0].status;
  const currentOrder  = STATUS_ORDER[currentStatus] ?? 0;
  const newOrder      = STATUS_ORDER[eventType] ?? 0;

  // Skip if already at this status or a later one
  // Exception: "failed" is terminal and can overwrite "sent"
  if (eventType !== 'failed' && newOrder <= currentOrder) {
    return {
      updated: false,
      skipped: true,
      reason: `Already at "${currentStatus}" (ignoring "${eventType}")`,
    };
  }

  // ── Perform the update ──────────────────────────────────────
  const tsCol = TIMESTAMP_COLUMNS[eventType];
  const ts    = timestamp || new Date().toISOString();

  await client.query(
    `UPDATE messages
     SET status = $1::message_status, ${tsCol} = $2
     WHERE campaign_id = $3 AND customer_id = $4`,
    [eventType, ts, campaignId, customerId]
  );

  return { updated: true, skipped: false };
}

// ── Recalculate campaign stats ────────────────────────────────

/**
 * Recalculates campaign_stats by counting actual message rows.
 * This is more accurate than incrementing — handles idempotency,
 * retries, and out-of-order callbacks correctly.
 *
 * @param {Object} client - PG client (inside transaction)
 * @param {string} campaignId
 * @returns {Object} Fresh stats: { total_sent, total_delivered, total_opened, total_clicked, total_failed }
 */
async function recalculateStats(client, campaignId) {
  const result = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('sent','delivered','opened','clicked','failed'))  AS total_sent,
       COUNT(*) FILTER (WHERE status IN ('delivered','opened','clicked'))                  AS total_delivered,
       COUNT(*) FILTER (WHERE status IN ('opened','clicked'))                              AS total_opened,
       COUNT(*) FILTER (WHERE status = 'clicked')                                          AS total_clicked,
       COUNT(*) FILTER (WHERE status = 'failed')                                           AS total_failed
     FROM messages
     WHERE campaign_id = $1`,
    [campaignId]
  );

  const stats = {
    total_sent:      parseInt(result.rows[0].total_sent)      || 0,
    total_delivered: parseInt(result.rows[0].total_delivered)  || 0,
    total_opened:    parseInt(result.rows[0].total_opened)     || 0,
    total_clicked:   parseInt(result.rows[0].total_clicked)    || 0,
    total_failed:    parseInt(result.rows[0].total_failed)     || 0,
  };

  // Update the campaign_stats row
  await client.query(
    `UPDATE campaign_stats
     SET total_sent      = $1,
         total_delivered  = $2,
         total_opened     = $3,
         total_clicked    = $4,
         updated_at       = NOW()
     WHERE campaign_id = $5`,
    [stats.total_sent, stats.total_delivered, stats.total_opened, stats.total_clicked, campaignId]
  );

  return stats;
}

// ── Main orchestrator ─────────────────────────────────────────

// In-memory stats store for mock mode
const mockStatsStore = new Map();

/**
 * Processes a single delivery event from the Channel Service.
 * Runs inside a transaction for atomicity.
 *
 * @param {Object} eventData - { campaign_id, customer_id, event_type, phone?, timestamp? }
 * @returns {Object} { processed, skipped, stats }
 */
async function processChannelEvent(eventData) {
  const { campaign_id, customer_id, event_type, timestamp } = eventData;

  if (!pool) {
    let stats = mockStatsStore.get(campaign_id);
    if (!stats) {
      stats = {
        total_sent: 5,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_failed: 0,
        delivered_customers: new Set(),
        opened_customers: new Set(),
        clicked_customers: new Set(),
        failed_customers: new Set(),
      };
      mockStatsStore.set(campaign_id, stats);
    }
    
    let processed = false;
    let skipped = true;
    let reason = 'Already processed';

    if (event_type === 'delivered' && !stats.delivered_customers.has(customer_id)) {
      stats.delivered_customers.add(customer_id);
      stats.total_delivered++;
      processed = true;
      skipped = false;
    } else if (event_type === 'opened' && !stats.opened_customers.has(customer_id)) {
      stats.opened_customers.add(customer_id);
      stats.total_opened++;
      processed = true;
      skipped = false;
    } else if (event_type === 'clicked' && !stats.clicked_customers.has(customer_id)) {
      stats.clicked_customers.add(customer_id);
      stats.total_clicked++;
      processed = true;
      skipped = false;
    } else if (event_type === 'failed' && !stats.failed_customers.has(customer_id)) {
      stats.failed_customers.add(customer_id);
      stats.total_failed++;
      processed = true;
      skipped = false;
    } else if (event_type === 'sent') {
      processed = true;
      skipped = false;
    }

    const returnStats = {
      total_sent: stats.total_sent,
      total_delivered: stats.total_delivered,
      total_opened: stats.total_opened,
      total_clicked: stats.total_clicked,
      total_failed: stats.total_failed,
    };

    return {
      processed,
      skipped,
      reason: skipped ? reason : undefined,
      stats: returnStats,
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Step 1: Update message status ─────────────────────────
    const updateResult = await updateMessageStatus(
      client, campaign_id, customer_id, event_type, timestamp
    );

    if (updateResult.skipped) {
      // Idempotent: already processed, just return current stats
      await client.query('ROLLBACK');
      client.release();

      // Still fetch current stats for the broadcast
      const statsResult = await pool.query(
        `SELECT total_sent, total_delivered, total_opened, total_clicked
         FROM campaign_stats WHERE campaign_id = $1`,
        [campaign_id]
      );

      const currentStats = statsResult.rows[0] || {
        total_sent: 0, total_delivered: 0, total_opened: 0, total_clicked: 0,
      };

      return {
        processed: false,
        skipped: true,
        reason: updateResult.reason,
        stats: currentStats,
      };
    }

    // ── Step 2: Recalculate aggregated stats ──────────────────
    const stats = await recalculateStats(client, campaign_id);

    // ── Commit ────────────────────────────────────────────────
    await client.query('COMMIT');

    return {
      processed: true,
      skipped: false,
      stats,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  validateWebhookInput,
  processChannelEvent,
  mockStatsStore,
};
