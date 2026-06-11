// ─────────────────────────────────────────────────────────────
// src/routes/messages.js
// POST /api/draft-messages — AI-native message generation
//
// Flow:
//   1. Marketer sends segment data (from Phase 1b chat result)
//   2. Gemini generates 3 message variants with different tones
//   3. Channel optimizer picks best channel + send time
//   4. Response: 3 cards ready for the marketer to choose from
//
// This is what makes Xeno "AI-native" — the marketer never
// writes copy. AI understands the persona and crafts messages.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { generateMessages } = require('../services/messageGenerator');

// ── Required fields for message generation ────────────────────
const REQUIRED_FIELDS = ['persona', 'count'];

/**
 * POST /api/draft-messages
 *
 * Request body:
 *   {
 *     "segment_name": "Lapsed High-Value Shoppers",
 *     "persona": "Lapsed High-Value",
 *     "count": 47,
 *     "avg_lifetime_value": "₹12,400",
 *     "last_purchase_avg_days": 65,
 *     "frequency_avg": 4.2,
 *     "product_preferences": ["jackets", "dresses"],
 *     "industry": "fashion",
 *     "top_cities": ["Delhi", "Mumbai"]
 *   }
 *
 * Response (200):
 *   {
 *     "success": true,
 *     "variants": [ { tone, message, cta, best_channel, engagement, ... } x3 ],
 *     "recommended_variant": 1,
 *     "recommended_channel": "whatsapp",
 *     "recommended_send_time": "7:30 PM",
 *     "reasoning": "..."
 *   }
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const segmentData = req.body;

    // ── Validate required fields ──────────────────────────────
    const missing = REQUIRED_FIELDS.filter(f => !segmentData[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        required_fields: REQUIRED_FIELDS,
        hint: 'Send segment data from the /api/chat response, or provide at minimum { "persona": "...", "count": N }',
        example: {
          persona: 'Lapsed High-Value',
          count: 47,
          avg_lifetime_value: '₹12,400',
          last_purchase_avg_days: 65,
          frequency_avg: 4.2,
          product_preferences: ['jackets', 'dresses'],
          industry: 'fashion',
          top_cities: ['Delhi', 'Mumbai'],
        },
      });
    }

    // Validate count is a positive number
    if (typeof segmentData.count !== 'number' || segmentData.count <= 0) {
      return res.status(400).json({
        success: false,
        error: '"count" must be a positive number',
      });
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✉️  Draft messages request: "${segmentData.persona}" (${segmentData.count} customers)`);
    console.log(`${'═'.repeat(60)}`);

    // ── Generate messages via Gemini + Channel Optimizer ──────
    const result = await generateMessages(segmentData);

    const durationMs = Date.now() - startTime;

    // ── Build response ────────────────────────────────────────
    const response = {
      success: true,
      segment: {
        name:     segmentData.segment_name || segmentData.persona,
        persona:  segmentData.persona,
        count:    segmentData.count,
      },
      ...result,
      duration_ms: durationMs,
    };

    console.log(`\n🎯 Generated ${result.variants.length} variants in ${durationMs}ms`);
    console.log(`   Recommended: Variant #${result.recommended_variant} via ${result.recommended_channel} at ${result.recommended_send_time}`);

    return res.json(response);

  } catch (err) {
    console.error('\n❌ Message generation error:', err.message);

    const status = err.message.includes('API')
      ? 502
      : 500;

    return res.status(status).json({
      success: false,
      error: err.message,
      hint: status === 502
        ? 'The AI service had an issue. Try again in a moment.'
        : 'Internal error. Check server logs.',
    });
  }
});

module.exports = router;
