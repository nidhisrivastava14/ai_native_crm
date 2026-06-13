// ─────────────────────────────────────────────────────────────
// src/api/client.js
// API client — simple fetch wrapper for backend calls
// ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

/**
 * Makes an API request to the CRM backend.
 * Uses Vite's proxy in dev (localhost:5173 → localhost:3000).
 *
 * @param {string} path - e.g. '/chat', '/draft-messages'
 * @param {Object} options - fetch options
 * @returns {Object} Parsed JSON response
 */
async function apiCall(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || data.message || `API error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/** POST /api/chat — Send marketer intent, get RFM segment */
export async function chatWithAI(message) {
  return apiCall('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/** POST /api/draft-messages — Generate 3 message variants */
export async function draftMessages(segmentData) {
  return apiCall('/draft-messages', {
    method: 'POST',
    body: JSON.stringify(segmentData),
  });
}

/** POST /api/campaigns/send — Dispatch campaign */
export async function sendCampaign(campaignData) {
  console.log("STEP 3 sendCampaign API payload:", JSON.stringify(campaignData, null, 2));
  return apiCall('/campaigns/send', {
    method: 'POST',
    body: JSON.stringify(campaignData),
  });
}

/** GET /api/campaigns/:id/stats — Fetch campaign stats */
export async function getCampaignStats(campaignId) {
  return apiCall(`/campaigns/${campaignId}/stats`);
}

/** GET /api/health — Health check */
export async function healthCheck() {
  return apiCall('/health');
}
