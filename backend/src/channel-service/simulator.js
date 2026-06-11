// ─────────────────────────────────────────────────────────────
// src/channel-service/simulator.js
// Message delivery simulator — the "Twilio" of our CRM
//
// Simulates the full lifecycle of each message:
//   pending → sent → delivered → opened → clicked (or failed)
//
// Each stage has realistic delays and probabilistic outcomes:
//   Sent:      100% (always sends)         0.5–2s delay
//   Delivered:  95% (5% fail)              1–3s after sent
//   Opened:     40% (of delivered)         2–10s after delivered
//   Clicked:    20% (of opened)            3–15s after opened
//
// All messages in a batch run in PARALLEL — just like real
// SMS/WhatsApp providers process a batch concurrently.
// ─────────────────────────────────────────────────────────────

// CRM webhook URL (where we send delivery callbacks)
const CRM_CALLBACK_URL = process.env.CRM_CALLBACK_URL
  || 'http://localhost:3000/api/webhooks/channel-events';

const MAX_RETRIES    = 3;
const RETRY_BASE_MS  = 500; // exponential backoff base

// ── Probability helpers ───────────────────────────────────────

/** Returns a random integer between min and max (inclusive, in ms) */
const randomDelay = (minSec, maxSec) =>
  Math.floor(Math.random() * (maxSec - minSec) * 1000) + minSec * 1000;

/** 95% delivery rate */
const shouldDeliver = () => Math.random() < 0.95;

/** 40% open rate (of delivered) */
const shouldOpen = () => Math.random() < 0.40;

/** 20% click rate (of opened) */
const shouldClick = () => Math.random() < 0.20;

/** Promise-based sleep */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Callback sender with retry ────────────────────────────────

/**
 * Sends a delivery event callback to the main CRM webhook.
 * Retries up to 3 times with exponential backoff.
 *
 * @param {Object} data - { campaign_id, customer_id, phone, event_type, timestamp }
 */
async function sendCallback(data) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(CRM_CALLBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return; // success
      console.warn(`   ⚠️  Callback returned ${res.status}, retry ${attempt}/${MAX_RETRIES}`);

    } catch (err) {
      const reason = err.name === 'AbortError' ? 'timeout' : err.message;
      if (attempt < MAX_RETRIES) {
        console.warn(`   ⚠️  Callback failed (${reason}), retry ${attempt}/${MAX_RETRIES}`);
        await sleep(RETRY_BASE_MS * attempt); // exponential backoff
      } else {
        console.error(`   ❌ Callback failed after ${MAX_RETRIES} retries (${reason})`);
      }
    }
  }
}

// ── Single message lifecycle simulator ────────────────────────

/**
 * Simulates the full delivery lifecycle for ONE message.
 * Sends callbacks to the CRM webhook at each stage.
 *
 * @param {string} campaignId
 * @param {Object} message - { customer_id, phone, message, channel }
 * @param {number} index - Message number (for logging)
 * @returns {Object} Summary: { delivered, opened, clicked, failed }
 */
async function simulateDelivery(campaignId, message, index) {
  const tag = `  #${String(index + 1).padStart(3)}`;
  const result = { sent: false, delivered: false, opened: false, clicked: false, failed: false };

  const buildCallback = (eventType) => ({
    campaign_id:  campaignId,
    customer_id:  message.customer_id,
    phone:        message.phone,
    event_type:   eventType,
    channel:      message.channel,
    timestamp:    new Date().toISOString(),
  });

  // ── Stage 1: SENT (100% — always sends) ─────────────────
  await sleep(randomDelay(0.5, 2));
  await sendCallback(buildCallback('sent'));
  result.sent = true;
  console.log(`${tag} ✉️  sent      → ${message.phone}`);

  // ── Stage 2: DELIVERED (95%) or FAILED (5%) ─────────────
  await sleep(randomDelay(1, 3));

  if (!shouldDeliver()) {
    // 5% fail — message never reaches the customer
    await sendCallback(buildCallback('failed'));
    result.failed = true;
    console.log(`${tag} ❌ failed    → ${message.phone}`);
    return result; // stop here
  }

  await sendCallback(buildCallback('delivered'));
  result.delivered = true;
  console.log(`${tag} 📱 delivered → ${message.phone}`);

  // ── Stage 3: OPENED (40% of delivered) ──────────────────
  if (!shouldOpen()) return result; // sits unread in inbox

  await sleep(randomDelay(2, 10));
  await sendCallback(buildCallback('opened'));
  result.opened = true;
  console.log(`${tag} 👀 opened   → ${message.phone}`);

  // ── Stage 4: CLICKED (20% of opened) ────────────────────
  if (!shouldClick()) return result; // read but didn't click

  await sleep(randomDelay(3, 15));
  await sendCallback(buildCallback('clicked'));
  result.clicked = true;
  console.log(`${tag} 🖱️  clicked  → ${message.phone}`);

  return result;
}

// ── Batch simulation orchestrator ─────────────────────────────

/**
 * Processes all messages for a campaign IN PARALLEL.
 * Returns immediately after kicking off — each message runs
 * on its own async timeline.
 *
 * @param {string} campaignId
 * @param {Object[]} messages - Array of { customer_id, phone, message, channel }
 */
async function simulateBatch(campaignId, messages) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`📬 Simulating ${messages.length} messages for campaign: ${campaignId}`);
  console.log(`   Callback URL: ${CRM_CALLBACK_URL}`);
  console.log(`${'─'.repeat(55)}`);

  const startTime = Date.now();

  // Fire ALL messages in parallel (like a real provider would)
  const promises = messages.map((msg, i) =>
    simulateDelivery(campaignId, msg, i).catch(err => {
      console.error(`  #${i + 1} ❌ Simulation error: ${err.message}`);
      return { sent: false, delivered: false, opened: false, clicked: false, failed: true };
    })
  );

  // Wait for all to complete, then log summary
  const results = await Promise.all(promises);

  const summary = results.reduce(
    (acc, r) => ({
      sent:      acc.sent      + (r.sent ? 1 : 0),
      delivered: acc.delivered + (r.delivered ? 1 : 0),
      opened:    acc.opened    + (r.opened ? 1 : 0),
      clicked:   acc.clicked   + (r.clicked ? 1 : 0),
      failed:    acc.failed    + (r.failed ? 1 : 0),
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`✅ Campaign ${campaignId} simulation complete (${elapsed}s)`);
  console.log(`   📨 Sent: ${summary.sent}/${messages.length}`);
  console.log(`   📱 Delivered: ${summary.delivered} (${((summary.delivered / messages.length) * 100).toFixed(0)}%)`);
  console.log(`   👀 Opened: ${summary.opened} (${messages.length > 0 ? ((summary.opened / messages.length) * 100).toFixed(0) : 0}%)`);
  console.log(`   🖱️  Clicked: ${summary.clicked} (${messages.length > 0 ? ((summary.clicked / messages.length) * 100).toFixed(0) : 0}%)`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log(`${'─'.repeat(55)}\n`);

  return summary;
}

module.exports = { simulateBatch };
