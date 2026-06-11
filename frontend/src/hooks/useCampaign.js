// ─────────────────────────────────────────────────────────────
// src/hooks/useCampaign.js
// Custom hook for campaign operations:
//   draft messages → select variant → send campaign
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { draftMessages, sendCampaign } from '../api/client';

/**
 * Manages message variants, variant selection, and campaign dispatch.
 *
 * Usage:
 *   const { variants, selectedVariant, campaignId, ... } = useCampaign();
 */
export default function useCampaign() {
  const [variants, setVariants] = useState(null);       // { variants, recommended_variant, ... }
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Calls /api/draft-messages with segment data.
   * Returns the 3 message variants from Gemini.
   */
  const generateMessages = useCallback(async (segmentData) => {
    setIsGenerating(true);
    setError(null);

    try {
      const data = await draftMessages({
        segment_name:          segmentData.segment_name,
        persona:               segmentData.persona,
        count:                 segmentData.count,
        avg_lifetime_value:    `₹${Math.round((segmentData.preview || []).reduce((s, c) => s + c.total_spent, 0) / Math.max((segmentData.preview || []).length, 1))}`,
        last_purchase_avg_days: Math.round((segmentData.preview || []).reduce((s, c) => s + (c.recency_days || 30), 0) / Math.max((segmentData.preview || []).length, 1)),
        frequency_avg:         Math.round(((segmentData.preview || []).reduce((s, c) => s + c.order_count, 0) / Math.max((segmentData.preview || []).length, 1)) * 10) / 10,
        product_preferences:   ['jackets', 'dresses', 'shoes'],
        industry:              'fashion',
        top_cities:            [...new Set((segmentData.preview || []).map(c => c.city))].slice(0, 3),
      });

      setVariants(data);
      // Auto-select the recommended variant (convert 1-indexed to 0-indexed)
      if (data.recommended_variant) {
        setSelectedVariant(data.recommended_variant - 1);
      }
      return data;
    } catch (err) {
      setError(err.message || 'Failed to generate messages');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Calls /api/campaigns/send to dispatch the selected variant.
   */
  const dispatchCampaign = useCallback(async (segmentData, variant, channel) => {
    setIsSending(true);
    setError(null);
    console.log("STEP 2 dispatchCampaign details:", { segmentData, variant, channel });

    try {
      // Collect all customer IDs from the segment preview
      // In production this would come from the full segment query
      const customerIds = (segmentData.preview || []).map(c => c.id);

      const data = await sendCampaign({
        segment_name: segmentData.segment_name,
        persona:      segmentData.persona,
        message:      variant.message,
        channel:      channel || 'whatsapp',
        tone:         variant.tone,
        customer_ids: customerIds,
        estimated_open_rate: variant.estimated_open_rate,
      });

      setCampaignId(data.campaign_id);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to send campaign');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  const resetCampaign = useCallback(() => {
    setVariants(null);
    setSelectedVariant(null);
    setCampaignId(null);
    setError(null);
  }, []);

  return {
    variants,
    selectedVariant,
    setSelectedVariant,
    campaignId,
    isGenerating,
    isSending,
    error,
    generateMessages,
    dispatchCampaign,
    resetCampaign,
  };
}
