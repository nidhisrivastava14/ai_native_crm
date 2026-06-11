// ─────────────────────────────────────────────────────────────
// src/components/Messages/MessageVariants.jsx
// Shows all 3 message variants and a "Send Campaign" button
// ─────────────────────────────────────────────────────────────

import MessageVariantCard from './MessageVariantCard';

/**
 * @param {Object} props
 * @param {Object} props.data - { variants: [...], recommended_variant, channel_recommendation }
 * @param {number|null} props.selectedIndex - Currently selected variant index
 * @param {Function} props.onSelect - (index) => void
 * @param {Function} props.onSend - Called when "Send Campaign" is clicked
 * @param {boolean} props.isSending - Loading state
 * @param {number} props.customerCount - Number of customers to send to
 */
export default function MessageVariants({
  data,
  selectedIndex,
  onSelect,
  onSend,
  isSending,
  customerCount,
}) {
  console.log('📊 MessageVariants received data:', data);
  
  if (!data || !data.variants) {
    console.error('❌ Invalid data structure:', data);
    return <div style={{ padding: '16px', color: '#ff6b6b' }}>Error: No variants data</div>;
  }
  if (!data || !data.variants) return null;

  const { variants, recommended_variant } = data;
  const selectedVariant = selectedIndex != null ? variants[selectedIndex] : null;
  const channel = selectedVariant?.channel_recommendation?.channel || 'whatsapp';

  return (
    <div className="variants-container">
      <div className="variants-header">
        ✉️ Choose a message variant for your campaign
      </div>

      {variants.map((variant, index) => (

        <MessageVariantCard
  key={index}
  variant={variant}
  selected={selectedIndex === index}
  recommended={recommended_variant === index + 1 || recommended_variant === index}
  onSelect={() => {
    console.log('🔴 MessageVariants: onSelect called with index:', index);
    onSelect(index);
  }}
/>
      ))}

      {/* Send button — only visible when a variant is selected */}
      {selectedVariant && (
        <div className="action-area">
          <button
            className="btn btn-ghost"
            onClick={() => onSelect(null)}
            disabled={isSending}
          >
            ← Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSend(selectedVariant, channel)}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <div className="spinner" />
                Sending...
              </>
            ) : (
              <>🚀 Send to {customerCount} customers via {channel}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
