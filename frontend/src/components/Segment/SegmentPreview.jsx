// ─────────────────────────────────────────────────────────────
// src/components/Segment/SegmentPreview.jsx
// Shows the AI-identified segment with stats + customer preview
// Features: Draggable top-border height resize with internal scroll
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';

/**
 * @param {Object} props
 * @param {Object} props.segment - { segment_name, persona, count, reasoning, preview }
 * @param {Function} props.onContinue - Called when marketer clicks "Generate Messages"
 * @param {boolean} props.isGenerating - Loading state for message generation
 */
export default function SegmentPreview({ segment, onContinue, isGenerating }) {
  if (!segment) return null;

  const { segment_name, persona, count, reasoning, preview = [] } = segment;

  // ── 1. Height & Dragging State ─────────────────────────────
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem('segment-preview-height');
    return saved ? parseInt(saved) : null; // null defaults to full auto height
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // ── 2. Handle Resizing from Top Border ──────────────────────
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);

    const startHeight = containerRef.current.offsetHeight;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent) => {
      // Dragging UPWARD (clientY decreases) increases height:
      const diffY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(800, startHeight - diffY));
      setHeight(newHeight);
      localStorage.setItem('segment-preview-height', newHeight.toString());
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    setHeight(null);
    localStorage.removeItem('segment-preview-height');
  };

  // ── 3. Calculations ────────────────────────────────────────
  const avgSpend = preview.length > 0
    ? Math.round(preview.reduce((sum, c) => sum + c.total_spent, 0) / preview.length)
    : 0;
  const avgRecency = preview.length > 0
    ? Math.round(preview.reduce((sum, c) => sum + (c.recency_days || 0), 0) / preview.length)
    : 0;

  return (
    <div
      ref={containerRef}
      className={`segment-preview resizable-card ${isDragging ? 'dragging' : ''}`}
      style={{
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Draggable Top Border Handle */}
      <div
        className="top-resize-handle"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize"
      >
        <div className="resize-grip-line" />
      </div>

      {/* Scrollable Inner Container */}
      <div className="resizable-content-scroll">
        {/* Header badge */}
        <div className="segment-header">
          <div className="segment-badge">
            <span>🎯</span>
            {persona || segment_name}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {count} customers
          </span>
        </div>

        {/* Stat cards */}
        <div className="segment-stats">
          <div className="segment-stat">
            <div className="segment-stat-value">{count}</div>
            <div className="segment-stat-label">Customers</div>
          </div>
          <div className="segment-stat">
            <div className="segment-stat-value">₹{avgSpend.toLocaleString('en-IN')}</div>
            <div className="segment-stat-label">Avg Spend</div>
          </div>
          <div className="segment-stat">
            <div className="segment-stat-value">{avgRecency}d</div>
            <div className="segment-stat-label">Avg Recency</div>
          </div>
        </div>

        {/* Customer preview list */}
        {preview.length > 0 && (
          <div className="segment-customers">
            <div className="segment-customers-title">Sample Customers</div>
            {preview.slice(0, 3).map((customer, i) => (
              <div key={customer.id || i} className="customer-row">
                <div className="customer-avatar-sm">
                  {(customer.name || 'C')[0].toUpperCase()}
                </div>
                <div className="customer-info">
                  <div className="customer-name">{customer.name}</div>
                  <div className="customer-meta">
                    {customer.city} · Last purchase {customer.recency_days}d ago · {customer.order_count} orders
                  </div>
                </div>
                <div className="customer-spend">
                  ₹{(customer.total_spent || 0).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI reasoning */}
        {reasoning && (
          <div className="reasoning-box">
            💡 {reasoning}
          </div>
        )}

        {/* Continue button */}
        <div className="action-area">
          <button
            className="btn btn-primary"
            onClick={onContinue}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="spinner" />
                Generating messages...
              </>
            ) : (
              <>✉️ Generate Messages</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
