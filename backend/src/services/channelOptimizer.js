// ─────────────────────────────────────────────────────────────
// src/services/channelOptimizer.js
// Channel + Send Time recommendation engine
//
// Uses persona + tone to recommend the best delivery channel
// and optimal send time. Based on industry open-rate data:
//   WhatsApp: ~82% open rate (instant, personal)
//   Email:    ~25% open rate (detailed, thoughtful)
//   SMS:      ~98% open rate (short, transactional)
// ─────────────────────────────────────────────────────────────

// ── Channel open rates by tone ────────────────────────────────
const CHANNEL_DATA = {
  whatsapp: { name: 'WhatsApp', avgOpen: 34, icon: '💬' },
  email:    { name: 'Email',    avgOpen: 18, icon: '📧' },
  sms:      { name: 'SMS',      avgOpen: 22, icon: '📱' },
};

// ── Tone → Channel mapping ────────────────────────────────────
// Based on marketing psychology:
//   Urgent  → WhatsApp (instant delivery, creates pressure)
//   Personal → Email (shows effort, room for detail)
//   Value   → WhatsApp (exclusivity + urgency window)
const TONE_CHANNEL_MAP = {
  'Urgent':   'whatsapp',
  'Personal': 'email',
  'Value':    'whatsapp',
};

// ── Persona → Send time mapping ───────────────────────────────
// Based on engagement analytics patterns:
const SEND_TIME_MAP = {
  'Champions':          { time: '6:30 PM', reason: 'Habitual shoppers browse early evening' },
  'Frequent Buyers':    { time: '6:30 PM', reason: 'Habitual shoppers browse early evening' },
  'New Customers':      { time: '8:00 PM', reason: 'New users engage more during leisure hours' },
  'Potential Loyalists': { time: '7:00 PM', reason: 'Mid-evening catches them winding down' },
  'Lapsed High-Value':  { time: '7:30 PM', reason: 'Evening — more receptive to win-back when relaxed' },
  'At Risk':            { time: '7:30 PM', reason: 'Evening nudge when they are most receptive' },
};

const DEFAULT_SEND_TIME = { time: '7:00 PM', reason: 'Peak evening engagement window' };

/**
 * Recommends the best channel for a given tone.
 *
 * @param {string} tone - "Urgent" | "Personal" | "Value"
 * @returns {{ channel, estimated_open_rate, icon }}
 */
function recommendChannel(tone) {
  const channelKey = TONE_CHANNEL_MAP[tone] || 'whatsapp';
  const data = CHANNEL_DATA[channelKey];

  // Adjust open rate slightly by tone match quality
  const boostMap = { 'Urgent': 6, 'Personal': 3, 'Value': 8 };
  const boost = boostMap[tone] || 0;
  const adjustedRate = Math.min(data.avgOpen + boost, 99);

  return {
    channel: channelKey,
    channel_name: data.name,
    estimated_open_rate: `${adjustedRate}%`,
    icon: data.icon,
  };
}

/**
 * Recommends the best overall channel for a persona (campaign-level).
 *
 * @param {string} persona - e.g. "Lapsed High-Value", "Champions"
 * @returns {string} "whatsapp" | "email" | "sms"
 */
function recommendCampaignChannel(persona) {
  // Win-back personas → WhatsApp (urgency)
  // Active loyal personas → SMS (quick, transactional feel)
  // New/Growing personas → Email (educate, build relationship)
  const map = {
    'Champions':          'whatsapp',
    'Frequent Buyers':    'sms',
    'New Customers':      'email',
    'Potential Loyalists': 'email',
    'Lapsed High-Value':  'whatsapp',
    'At Risk':            'whatsapp',
  };
  return map[persona] || 'whatsapp';
}

/**
 * Returns recommended send time for a persona.
 *
 * @param {string} persona
 * @returns {{ time: string, reason: string }}
 */
function recommendSendTime(persona) {
  return SEND_TIME_MAP[persona] || DEFAULT_SEND_TIME;
}

/**
 * Predicts engagement rate based on tone × persona fit.
 * Returns "high" (45-55%), "medium" (35-44%), or "low" (<35%).
 *
 * @param {string} tone
 * @param {string} persona
 * @returns {{ level, rate, explanation }}
 */
function predictEngagement(tone, persona) {
  // Persona × Tone fit matrix (higher = better fit)
  const fitMatrix = {
    'Lapsed High-Value':  { 'Urgent': 92, 'Personal': 78, 'Value': 88 },
    'At Risk':            { 'Urgent': 70, 'Personal': 65, 'Value': 80 },
    'Champions':          { 'Urgent': 60, 'Personal': 85, 'Value': 90 },
    'Frequent Buyers':    { 'Urgent': 75, 'Personal': 70, 'Value': 85 },
    'New Customers':      { 'Urgent': 55, 'Personal': 80, 'Value': 65 },
    'Potential Loyalists': { 'Urgent': 65, 'Personal': 82, 'Value': 78 },
  };

  const personaFit = fitMatrix[persona] || fitMatrix['Lapsed High-Value'];
  const fitScore = personaFit[tone] || 70;

  // Convert fit score to an engagement rate estimate
  const baseRate = 30;
  const rate = baseRate + Math.round((fitScore / 100) * 25); // 30–55% range

  let level, explanation;
  if (rate >= 45) {
    level = 'high';
    explanation = `${tone} tone is a strong match for ${persona} — expect above-average engagement`;
  } else if (rate >= 38) {
    level = 'medium';
    explanation = `${tone} tone is a decent match for ${persona} — solid but not optimal`;
  } else {
    level = 'low';
    explanation = `${tone} tone is a weak match for ${persona} — consider a different approach`;
  }

  return { level, rate: `${rate}%`, explanation };
}

module.exports = {
  recommendChannel,
  recommendCampaignChannel,
  recommendSendTime,
  predictEngagement,
};
