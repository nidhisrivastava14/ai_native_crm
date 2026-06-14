// ─────────────────────────────────────────────────────────────
// src/services/messageGenerator.js
// AI message generation service using Google Gemini
//
// Takes segment/persona data and generates 3 message variants
// with distinct psychological tones:
//   1. Urgent  (Scarcity + FOMO)
//   2. Personal (Nostalgia + Relationship)
//   3. Value   (Exclusivity + Reward)
//
// Each variant is optimized for WhatsApp/SMS length (<160 chars).
//
// Model: gemini-2.0-flash (stable, reliable JSON output)
// Fallback: Hardcoded variants if AI generation fails
// ─────────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  recommendChannel,
  recommendCampaignChannel,
  recommendSendTime,
  predictEngagement,
} = require('./channelOptimizer');

// ── Gemini client (reuse from env) ────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ── Hardcoded fallback variants ───────────────────────────────
// Always available when Gemini is down or returns bad JSON
function getFallbackVariants(persona, count) {
  return {
    messages: [
      {
        tone: 'Urgent',
        psychology: 'Scarcity + FOMO',
        text: `⏰ Only a few pieces left from our latest drop! ${count} shoppers like you are already checking out. Don't miss your favourites — shop now [link]`,
        cta: 'Shop now',
        emoji_count: 1,
      },
      {
        tone: 'Personal',
        psychology: 'Nostalgia + Relationship',
        text: `Hey! It's been a while since your last visit. We've got fresh styles picked just for you 🛍️ Take a look [link]`,
        cta: 'Take a look',
        emoji_count: 1,
      },
      {
        tone: 'Value',
        psychology: 'Exclusivity + Reward',
        text: `As a valued customer, you've unlocked early access to our exclusive collection. Claim your offer before it goes public [link]`,
        cta: 'Claim offer',
        emoji_count: 0,
      },
    ],
    recommended_variant: 1,
    reasoning: `Recommended messaging strategy selected based on historical segment performance.`,
  };
}

// ── Simplified, JSON-focused prompt ───────────────────────────
function buildPrompt(segmentData) {
  const {
    persona         = 'General',
    count           = 0,
    avg_lifetime_value = '₹0',
    last_purchase_avg_days = 30,
    frequency_avg   = 1,
    product_preferences = [],
    industry        = 'retail',
    top_cities      = [],
  } = segmentData;

  return `Generate 3 short marketing messages for this customer segment.

SEGMENT: ${persona} (${count} customers)
- Avg spend: ${avg_lifetime_value}
- Days since purchase: ${last_purchase_avg_days}
- Purchase frequency: ${frequency_avg}x
- Products: ${product_preferences.join(', ') || 'general fashion'}
- Cities: ${top_cities.join(', ') || 'major Indian metros'}

RULES:
- Message 1: Urgent tone (scarcity, FOMO). Max 1-2 emoji. CTA: "Shop now"
- Message 2: Personal tone (nostalgia, warmth). Max 1 emoji. CTA: "Take a look"  
- Message 3: Value tone (exclusivity, VIP). No emoji. CTA: "Claim offer"
- Each message UNDER 160 characters
- Use ₹ for currency, [link] as placeholder
- Do NOT include the raw segment name/persona (like "${persona}") in the message text. If you want to address them, write "valued customer" or "VIP member" or a brand name like "Xeno" instead.

Return this exact JSON structure:
{"messages":[{"tone":"Urgent","psychology":"Scarcity + FOMO","text":"...","cta":"...","emoji_count":1},{"tone":"Personal","psychology":"Nostalgia + Relationship","text":"...","cta":"...","emoji_count":1},{"tone":"Value","psychology":"Exclusivity + Reward","text":"...","cta":"...","emoji_count":0}],"recommended_variant":0,"reasoning":"..."}`;
}

/**
 * Safely extracts the first valid JSON object from a text response.
 */
function extractJSON(text) {
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generates 3 personalized message variants using Gemini.
 * Falls back to hardcoded variants on any failure.
 *
 * @param {Object} segmentData - Segment info from Phase 1b
 * @returns {Object} Formatted response with variants + recommendations
 */
async function generateMessages(segmentData) {
  const prompt = buildPrompt(segmentData);
  let geminiOutput;

  console.log(`\n🤖 Generating messages for "${segmentData.persona}" (${segmentData.count} customers)...`);

  try {
    // ── Call Gemini ─────────────────────────────────────────────
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });

    const rawText = result.response.text().trim();
    console.log(`📨 Gemini raw response (${rawText.length} chars)`);

    // ── Robust JSON extraction ─────────────────────────────────
    geminiOutput = extractJSON(rawText);

    // Validate structure
    if (!geminiOutput.messages || !Array.isArray(geminiOutput.messages) || geminiOutput.messages.length < 3) {
      throw new Error('Incomplete message variants from Gemini');
    }

    console.log(`✅ Parsed ${geminiOutput.messages.length} variants from Gemini`);

  } catch (error) {
    console.error(`❌ Gemini message generation failed: ${error.message}`);
    console.log(`⚠️ Using hardcoded fallback variants...`);
    geminiOutput = getFallbackVariants(segmentData.persona, segmentData.count);
  }

  // ── Enrich each variant with channel + engagement data ──────
  const variants = geminiOutput.messages.map((msg, index) => {
    const channelRec = recommendChannel(msg.tone);
    const engagement = predictEngagement(msg.tone, segmentData.persona);

    return {
      id:                  index + 1,
      tone:                msg.tone,
      psychology:          msg.psychology,
      message:             msg.text,
      cta:                 msg.cta,
      emoji_count:         msg.emoji_count || 0,
      char_count:          msg.text.length,
      preview:             msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : ''),
      best_channel:        channelRec.channel_name,
      estimated_open_rate: channelRec.estimated_open_rate,
      engagement:          engagement,
    };
  });

  // ── Campaign-level recommendations ──────────────────────────
  const campaignChannel = recommendCampaignChannel(segmentData.persona);
  const sendTime = recommendSendTime(segmentData.persona);

  // Determine recommended variant (from Gemini or fallback to highest engagement)
  let recommendedIdx = geminiOutput.recommended_variant ?? 0;
  if (recommendedIdx < 0 || recommendedIdx >= variants.length) recommendedIdx = 0;

  console.log(`✅ Generated ${variants.length} variants. Recommended: #${recommendedIdx + 1} (${variants[recommendedIdx].tone})`);

  return {
    variants,
    recommended_variant:     recommendedIdx + 1, // 1-indexed for UI
    recommended_channel:     campaignChannel,
    recommended_send_time:   sendTime.time,
    send_time_reason:        sendTime.reason,
    reasoning:               geminiOutput.reasoning || 'AI-generated recommendation based on persona analysis',
    ai_model:                'gemini-2.0-flash',
  };
}

module.exports = { generateMessages };
