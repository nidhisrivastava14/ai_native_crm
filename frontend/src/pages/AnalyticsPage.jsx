import React, { useState, useEffect } from 'react';

export default function AnalyticsPage() {
  const [segments, setSegments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/api/analytics/segments/churn`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('Churn data:', data);
        const mapped = {};
        if (Array.isArray(data)) {
          data.forEach(item => {
            mapped[item.risk_level] = item;
          });
        }
        setSegments(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Churn fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%', height: '100%', overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="message-error" style={{ padding: '16px', borderRadius: '8px' }}>
          Error: {error}
        </div>
      ) : (
        <>
          <div className="page-header">
            <h1 className="page-title">Advanced Analytics</h1>
            <p className="page-subtitle">Predictive segmentations, Customer Lifetime Value (CLV), and risk forecasting.</p>
          </div>

          {/* AI Tip Box */}
          <div className="ai-tip">
            <span className="ai-tip-icon">💡</span>
            <div>
              <strong>AI Tip:</strong> High Risk churn segments are calculated comparing purchase frequency to gap time. Target these customers with SMS or WhatsApp urgent promos.
            </div>
          </div>

          {/* Churn Risk Section Header with Info */}
          <div style={{ marginTop: '32px', marginBottom: '20px' }}>
            <h2 className="section-title">Churn Risk Analysis</h2>
            <p className="section-description">
              Churn Risk predicts which customers are likely to stop buying. We compare how often they used to buy vs. how long it's been since their last purchase. High Risk = act fast!
            </p>
          </div>

          {/* Cards Grid */}
          <div className="churn-grid">
            {/* HIGH RISK */}
            <div className="risk-card high">
              <div className="risk-header">
                <div className="risk-title">HIGH RISK</div>
                <div className="tooltip-icon" title="Customers inactive longer than 1.5x their average purchase interval. Act now to prevent loss.">ℹ️</div>
              </div>
              <div className="risk-number">{segments.high?.customer_count || 0}</div>
              <div className="risk-label">customers</div>
              
              <div className="risk-metric">
                <div className="metric-label">Avg Churn Score</div>
                <div className="metric-value">{segments.high?.avg_churn_score || 0}%</div>
              </div>
              
              <div className="risk-metric">
                <div className="metric-label">Avg Lifetime Value</div>
                <div className="metric-value">₹{(segments.high?.avg_clv || 0).toLocaleString()}</div>
                <div className="metric-description">Predicted revenue at risk</div>
              </div>
            </div>

            {/* MEDIUM RISK */}
            <div className="risk-card medium">
              <div className="risk-header">
                <div className="risk-title">MEDIUM RISK</div>
                <div className="tooltip-icon" title="Customers showing signs of reduced activity. Send retention campaigns soon.">ℹ️</div>
              </div>
              <div className="risk-number">{segments.medium?.customer_count || 0}</div>
              <div className="risk-label">customers</div>
              
              <div className="risk-metric">
                <div className="metric-label">Avg Churn Score</div>
                <div className="metric-value">{segments.medium?.avg_churn_score || 0}%</div>
              </div>
              
              <div className="risk-metric">
                <div className="metric-label">Avg Lifetime Value</div>
                <div className="metric-value">₹{(segments.medium?.avg_clv || 0).toLocaleString()}</div>
                <div className="metric-description">Potential revenue to protect</div>
              </div>
            </div>

            {/* LOW RISK */}
            <div className="risk-card low">
              <div className="risk-header">
                <div className="risk-title">LOW RISK</div>
                <div className="tooltip-icon" title="Loyal, active customers. Focus on loyalty programs and upsells.">ℹ️</div>
              </div>
              <div className="risk-number">{segments.low?.customer_count || 0}</div>
              <div className="risk-label">customers</div>
              
              <div className="risk-metric">
                <div className="metric-label">Avg Churn Score</div>
                <div className="metric-value">{segments.low?.avg_churn_score || 0}%</div>
              </div>
              
              <div className="risk-metric">
                <div className="metric-label">Avg Lifetime Value</div>
                <div className="metric-value">₹{(segments.low?.avg_clv || 0).toLocaleString()}</div>
                <div className="metric-description">Loyal, growing revenue</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
