// ─────────────────────────────────────────────────────────────
// src/routes/campaigns.js
// POST /api/campaigns/send — Dispatch a campaign to customers
//
// Orchestration flow:
//   1. Validate input
//   2. Create campaign + messages + stats in one transaction
//   3. Fire-and-forget call to Channel Service
//   4. Return campaign ID immediately (don't wait for delivery)
//
// The Channel Service will call back to /api/webhooks/channel-events
// as messages get delivered/opened/clicked.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { validateCampaignInput } = require('../services/validationService');
const {
  createCampaign,
  buildChannelPayload,
  callChannelService,
} = require('../services/campaignService');

/**
 * POST /api/campaigns/send
 *
 * Request body:
 *   {
 *     "segment_name": "Lapsed High-Value Shoppers",
 *     "persona": "Lapsed High-Value",
 *     "message": "Hey! Winter collection is almost sold out...",
 *     "channel": "whatsapp",
 *     "customer_ids": ["uuid-1", "uuid-2", ...],
 *     "tone": "Urgent",                     // optional
 *     "estimated_open_rate": "48%"           // optional
 *   }
 *
 * Response (200):
 *   {
 *     "success": true,
 *     "campaign_id": "uuid",
 *     "total_customers": 47,
 *     "status_text": "🚀 Sending to 47 customers",
 *     ...
 *   }
 */
router.post('/send', async (req, res) => {
  const startTime = Date.now();
  console.log("BACKEND: POST /api/campaigns/send hit with payload:", JSON.stringify(req.body, null, 2));

  try {
    // ── 1. Validate input ─────────────────────────────────────
    const validation = validateCampaignInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign data',
        missing_fields: validation.errors,
        hint: 'Check the required fields and try again.',
      });
    }

    const {
      segment_name,
      persona,
      message,
      channel,
      customer_ids,
      tone = null,
      estimated_open_rate = null,
    } = req.body;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🚀 Campaign send request: "${segment_name}"`);
    console.log(`   ${customer_ids.length} customers via ${channel} (${tone || 'default'} tone)`);
    console.log(`${'═'.repeat(60)}`);

    // ── 2. Create campaign in DB (atomic transaction) ─────────
    const campaign = await createCampaign({
      segment_name,
      persona,
      message,
      channel,
      customer_ids,
    });

    // ── 3. Call Channel Service (async, fire-and-forget) ──────
    // We do NOT await the full delivery — just queue it.
    const payload = buildChannelPayload(
      campaign.campaignId,
      message,
      channel,
      campaign.customerPhones
    );

    // Fire-and-forget: don't block the response
    callChannelService(payload).catch(err => {
      console.error(`   ❌ Channel service background error: ${err.message}`);
    });

    // ── 4. Return immediately ─────────────────────────────────
    const durationMs = Date.now() - startTime;

    const response = {
      success:             true,
      campaign_id:         campaign.campaignId,
      segment_name,
      persona,
      total_customers:     campaign.totalMessages,
      channel,
      tone:                tone || 'default',
      message_preview:     message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      status_text:         `🚀 Sending to ${campaign.totalMessages} customers`,
      estimated_open_rate: estimated_open_rate || 'N/A',
      created_at:          campaign.createdAt,
      duration_ms:         durationMs,
    };

    console.log(`\n✅ Campaign ${campaign.campaignId} queued in ${durationMs}ms`);
    console.log(`   Channel Service will deliver asynchronously.\n`);

    return res.json(response);

  } catch (err) {
    console.error('\n❌ Campaign send error:', err.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      detail: err.message,
      hint: 'Check database connection and try again.',
    });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/campaigns/:id/stats — Live campaign performance
// (Placeholder for Phase 1d, returns current stats from DB)
// ──────────────────────────────────────────────────────────────

router.get('/:id/stats', async (req, res) => {
  try {
    const { pool } = require('../services/database');
    const { id } = req.params;

    if (!pool) {
      const { mockStatsStore } = require('../services/webhookService');
      const stats = mockStatsStore.get(id) || {
        total_sent: 5,
        total_delivered: 2,
        total_opened: 1,
        total_clicked: 0,
        total_failed: 0,
      };

      const sent = stats.total_sent || 0;
      const deliveryRate = sent > 0 ? ((stats.total_delivered / sent) * 100).toFixed(1) : '0.0';
      const openRate     = sent > 0 ? ((stats.total_opened / sent) * 100).toFixed(1) : '0.0';
      const clickRate    = sent > 0 ? ((stats.total_clicked / sent) * 100).toFixed(1) : '0.0';

      return res.json({
        success: true,
        campaign_id: id,
        segment_name: 'Mock Campaign',
        channel: 'whatsapp',
        status: 'sending',
        stats: {
          total_sent: stats.total_sent,
          total_delivered: stats.total_delivered,
          total_opened: stats.total_opened,
          total_clicked: stats.total_clicked,
          total_failed: stats.total_failed,
          delivery_rate: `${deliveryRate}%`,
          open_rate: `${openRate}%`,
          click_rate: `${clickRate}%`,
        },
        created_at: new Date().toISOString(),
      });
    }

    // Fetch campaign + stats in one query
    const result = await pool.query(
      `SELECT
        c.id AS campaign_id,
        c.segment_name,
        c.channel,
        c.status,
        c.created_at,
        cs.total_sent,
        cs.total_delivered,
        cs.total_opened,
        cs.total_clicked,
        cs.updated_at AS stats_updated_at
       FROM campaigns c
       LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const row = result.rows[0];

    // Compute rates
    const sent = row.total_sent || 0;
    const deliveryRate = sent > 0 ? ((row.total_delivered / sent) * 100).toFixed(1) : '0.0';
    const openRate     = sent > 0 ? ((row.total_opened / sent) * 100).toFixed(1) : '0.0';
    const clickRate    = sent > 0 ? ((row.total_clicked / sent) * 100).toFixed(1) : '0.0';

    return res.json({
      success: true,
      campaign_id:    row.campaign_id,
      segment_name:   row.segment_name,
      channel:        row.channel,
      status:         row.status,
      stats: {
        total_sent:      row.total_sent || 0,
        total_delivered:  row.total_delivered || 0,
        total_opened:     row.total_opened || 0,
        total_clicked:    row.total_clicked || 0,
        delivery_rate:    `${deliveryRate}%`,
        open_rate:        `${openRate}%`,
        click_rate:       `${clickRate}%`,
      },
      created_at:      row.created_at,
      stats_updated_at: row.stats_updated_at,
    });

  } catch (err) {
    console.error('❌ Stats fetch error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
