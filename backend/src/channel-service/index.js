// ─────────────────────────────────────────────────────────────
// src/channel-service/index.js
// Channel Service — Express server on port 5001
//
// This is a SEPARATE microservice from the main CRM.
// It simulates what Twilio/SendGrid/Gupshup does:
//   1. Receives a batch of messages
//   2. Returns 200 immediately ("I got it")
//   3. Processes delivery in the background
//   4. Calls back the CRM webhook with delivery events
//
// Start: node src/channel-service/index.js
// Port:  5001 (main CRM runs on 3000)
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const { simulateBatch } = require('./simulator');

const app = express();
const PORT = process.env.CHANNEL_SERVICE_PORT || 5001;

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' })); // large batches

// Request logging
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'xeno-channel-service-simulator',
    port: PORT,
    rates: {
      delivery: '95%',
      open: '40%',
      click: '20%',
    },
  });
});

// ── POST /simulate — Main endpoint ───────────────────────────
app.post('/simulate', (req, res) => {
  const { campaign_id, messages, channel, callback_url } = req.body;

  // ── Validate input ──────────────────────────────────────────
  if (!campaign_id) {
    return res.status(400).json({
      status: 'error',
      error: 'campaign_id is required',
    });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      status: 'error',
      error: 'messages must be a non-empty array',
    });
  }

  console.log(`\n📨 Received simulation request:`);
  console.log(`   Campaign:  ${campaign_id}`);
  console.log(`   Messages:  ${messages.length}`);
  console.log(`   Channel:   ${channel || messages[0]?.channel || 'unknown'}`);

  // ── Override callback URL if provided ────────────────────────
  if (callback_url) {
    process.env.CRM_CALLBACK_URL = callback_url;
    console.log(`   Callback:  ${callback_url}`);
  }

  // ── Return immediately — simulation runs in background ──────
  res.json({
    status: 'success',
    campaign_id,
    total_messages: messages.length,
    message: 'Simulation started. Callbacks will be sent to CRM webhook.',
    estimated_duration: `${Math.ceil(messages.length * 0.5)}–${messages.length * 0.8} seconds`,
  });

  // ── Fire simulation (async, runs after response is sent) ────
  // We deliberately do NOT await — the response is already sent.
  simulateBatch(campaign_id, messages).catch(err => {
    console.error(`\n💥 Simulation batch error: ${err.message}`);
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    available: [
      'GET  /health',
      'POST /simulate → { campaign_id, messages: [...] }',
    ],
  });
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       Xeno Channel Service — Delivery Simulator     ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Service:   http://localhost:${PORT}                  ║`);
  console.log(`║  🏥 Health:    http://localhost:${PORT}/health            ║`);
  console.log(`║  📨 Simulate:  POST http://localhost:${PORT}/simulate     ║`);
  console.log('║                                                      ║');
  console.log('║  📊 Delivery rates:                                  ║');
  console.log('║     Sent: 100% │ Delivered: 95% │ Fail: 5%          ║');
  console.log('║     Opened: 40% (of delivered)                      ║');
  console.log('║     Clicked: 20% (of opened)                        ║');
  console.log('║                                                      ║');
  console.log(`║  🔗 Callbacks → ${process.env.CRM_CALLBACK_URL || 'http://localhost:3000/api/webhooks/channel-events'}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
});
