// ─────────────────────────────────────────────────────────────
// src/services/campaignService.js
// Campaign orchestration — DB transactions + Channel Service call
//
// This is the core "two-service" pattern:
//   1. Write campaign + message records in a single transaction
//   2. Fire-and-forget call to Channel Service (async delivery)
//   3. Return immediately — don't block on delivery
//
// Mirrors real-world CRM architecture (Twilio, SendGrid, etc.)
// ─────────────────────────────────────────────────────────────

const { pool, MOCK_CUSTOMERS } = require('./database');

// Channel Service URL (separate Node service on port 5001)
const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';

// ──────────────────────────────────────────────────────────────
// 1. CREATE CAMPAIGN (atomic DB transaction)
// ──────────────────────────────────────────────────────────────

/**
 * Creates a campaign + all per-customer message records + stats row.
 * Everything is wrapped in a single transaction — all or nothing.
 *
 * @param {Object} params
 * @param {string} params.segment_name
 * @param {string} params.persona
 * @param {string} params.message
 * @param {string} params.channel
 * @param {string[]} params.customer_ids - Array of customer UUIDs
 * @returns {Object} { campaignId, totalMessages, customerPhones }
 */
async function createCampaign({ segment_name, persona, message, channel, customer_ids }) {
  if (!pool) {
    console.log(`\n📨 [MOCK MODE] Creating campaign: "${segment_name}" via ${channel}`);
    const campaignId = 'mock-' + Math.random().toString(36).substring(2, 15);
    const createdAt = new Date().toISOString();
    
    // Resolve mock customers for the IDs passed in
    const resolvedIds = (customer_ids && customer_ids.length > 0) ? customer_ids : [1, 2, 3, 4, 5];
    const customerPhones = resolvedIds.map(id => {
      const mockCust = MOCK_CUSTOMERS.find(c => c.id === id || String(c.id) === String(id)) || MOCK_CUSTOMERS[0];
      return { id: mockCust.id, phone: mockCust.phone };
    });
    
    console.log(`  ✓ [MOCK] Resolved ${customerPhones.length} mock customer phone numbers`);
    console.log(`  ✅ [MOCK] Mock Campaign created: ${campaignId}`);

    // Store in mock stats store
    const { mockStatsStore } = require('./webhookService');
    mockStatsStore.set(campaignId, {
      total_sent: customerPhones.length,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      total_failed: 0,
      delivered_customers: new Set(),
      opened_customers: new Set(),
      clicked_customers: new Set(),
      failed_customers: new Set(),
    });

    return {
      campaignId,
      createdAt,
      totalMessages: customerPhones.length,
      customerPhones,
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Step 1: Insert campaign record ────────────────────────
    console.log(`\n📨 Creating campaign: "${segment_name}" via ${channel}`);

    const campaignResult = await client.query(
      `INSERT INTO campaigns (segment_name, message, channel, status)
       VALUES ($1, $2, $3, 'sending')
       RETURNING id, created_at`,
      [segment_name, message, channel]
    );

    const campaignId = campaignResult.rows[0].id;
    const createdAt  = campaignResult.rows[0].created_at;
    console.log(`  ✓ Campaign created: ${campaignId}`);

    // ── Step 2: Fetch phone numbers for all target customers ──
    const phoneResult = await client.query(
      `SELECT id, phone FROM customers WHERE id = ANY($1::uuid[])`,
      [customer_ids]
    );

    const customerPhones = phoneResult.rows; // [{ id, phone }, ...]
    console.log(`  ✓ Resolved ${customerPhones.length} customer phone numbers`);

    // Warn if some customer_ids weren't found (stale data)
    if (customerPhones.length < customer_ids.length) {
      const foundIds = new Set(customerPhones.map(c => c.id));
      const missing = customer_ids.filter(id => !foundIds.has(id));
      console.warn(`  ⚠️  ${missing.length} customer IDs not found in DB (skipped)`);
    }

    // ── Step 3: Batch insert message records ──────────────────
    // One row per (campaign, customer) — tracks delivery lifecycle
    if (customerPhones.length > 0) {
      const values = [];
      const placeholders = customerPhones.map((cust, i) => {
        const base = i * 4;
        values.push(campaignId, cust.id, cust.phone, 'pending');
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::message_status)`;
      });

      await client.query(
        `INSERT INTO messages (campaign_id, customer_id, phone, status)
         VALUES ${placeholders.join(', ')}`,
        values
      );

      console.log(`  ✓ Inserted ${customerPhones.length} message records`);
    }

    // ── Step 4: Initialize campaign_stats row ─────────────────
    await client.query(
      `INSERT INTO campaign_stats (campaign_id, total_sent, total_delivered, total_opened, total_clicked)
       VALUES ($1, $2, 0, 0, 0)`,
      [campaignId, customerPhones.length]
    );

    console.log(`  ✓ Campaign stats initialized (sent: ${customerPhones.length})`);

    // ── Commit transaction ────────────────────────────────────
    await client.query('COMMIT');
    console.log(`  ✅ Transaction committed`);

    return {
      campaignId,
      createdAt,
      totalMessages: customerPhones.length,
      customerPhones,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ❌ Transaction rolled back: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

// ──────────────────────────────────────────────────────────────
// 2. BUILD CHANNEL SERVICE PAYLOAD
// ──────────────────────────────────────────────────────────────

/**
 * Builds the message payload for the Channel Service.
 *
 * @param {string} campaignId
 * @param {string} message - The campaign message text
 * @param {string} channel - "whatsapp" | "email" | "sms"
 * @param {{ id: string, phone: string }[]} customerPhones
 * @returns {Object} Payload ready for POST /simulate
 */
function buildChannelPayload(campaignId, message, channel, customerPhones) {
  return {
    campaign_id: campaignId,
    channel,
    callback_url: `${process.env.CRM_BASE_URL || 'http://localhost:3000'}/api/webhooks/channel-events`,
    messages: customerPhones.map(cust => ({
      customer_id: cust.id,
      phone:       cust.phone,
      message,
      channel,
    })),
  };
}

// ──────────────────────────────────────────────────────────────
// 3. CALL CHANNEL SERVICE (fire-and-forget)
// ──────────────────────────────────────────────────────────────

/**
 * Sends the campaign payload to the Channel Service for async delivery.
 *
 * This is FIRE-AND-FORGET:
 * - We don't await the full delivery
 * - Channel Service will call back with delivery events
 * - If the call fails, we log it but don't fail the campaign
 *
 * @param {Object} payload - From buildChannelPayload()
 */
async function callChannelService(payload) {
  const url = `${CHANNEL_SERVICE_URL}/simulate`;

  console.log(`\n🔄 Calling Channel Service: POST ${url}`);
  console.log(`   Payload: ${payload.messages.length} messages for campaign ${payload.campaign_id}`);

  try {
    // Fire-and-forget using native fetch (Node 18+)
    // We use a short timeout — we don't need to wait for delivery
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Channel Service accepted: ${data.message || 'OK'}`);
    } else {
      console.warn(`   ⚠️  Channel Service returned ${response.status}`);
    }

  } catch (err) {
    // DON'T throw — campaign is already created in DB.
    // Channel Service might be down; messages stay in "pending" and can be retried.
    if (err.name === 'AbortError') {
      console.warn(`   ⚠️  Channel Service timeout (5s). Messages queued for retry.`);
    } else {
      console.warn(`   ⚠️  Channel Service unreachable: ${err.message}`);
      console.warn(`   ℹ️  Campaign ${payload.campaign_id} saved. Start Channel Service to process.`);
    }
  }
}

module.exports = {
  createCampaign,
  buildChannelPayload,
  callChannelService,
};
