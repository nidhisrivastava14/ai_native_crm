import React from 'react';

export function ChurnRiskCard({ segments }) {
  if (!segments || segments.length === 0) {
    return <div className="card">No Churn Risk segment data available.</div>;
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Churn Risk Analysis</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {segments.map((seg) => {
          const riskClass = {
            "High Risk": "high-risk",
            "Medium Risk": "medium-risk",
            "Low Risk": "low-risk"
          }[seg.name] || "low-risk";

          return (
            <div key={seg.name} className={`stat-card ${riskClass}`}>
              <div className="stat-label">
                {seg.name}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>
                {seg.customer_count} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>customers</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Avg Churn Score: <strong>{seg.avg_churn_score}%</strong>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Avg CLV: <strong>₹{seg.avg_clv.toLocaleString('en-IN')}</strong>
              </div>

              <div style={{ borderTop: `1px solid var(--border-default)`, paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Sample Customers</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {seg.customer_sample && seg.customer_sample.map((cust) => (
                    <div key={cust.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 500 }}>{cust.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>₹{cust.clv.toLocaleString('en-IN')} CLV</span>
                    </div>
                  ))}
                  {(!seg.customer_sample || seg.customer_sample.length === 0) && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None found</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConversionFunnel({ funnel, revenue, hideTitle = false }) {
  if (!funnel) return null;

  const stages = [
    { label: 'Sent', value: funnel.sent, pct: 100, color: 'var(--blue-500)' },
    { label: 'Delivered', value: funnel.delivered, pct: funnel.sent > 0 ? Math.round((funnel.delivered / funnel.sent) * 100) : 0, color: 'var(--green-500)' },
    { label: 'Opened', value: funnel.opened, pct: funnel.delivered > 0 ? Math.round((funnel.opened / funnel.delivered) * 100) : 0, color: 'var(--purple-500)' },
    { label: 'Clicked', value: funnel.clicked, pct: funnel.opened > 0 ? Math.round((funnel.clicked / funnel.opened) * 100) : 0, color: 'var(--orange-500)' },
    { label: 'Purchased', value: funnel.purchased, pct: funnel.clicked > 0 ? Math.round((funnel.purchased / funnel.clicked) * 100) : 0, color: 'var(--red-500)' }
  ];

  const convRate = funnel.sent > 0 ? ((funnel.purchased / funnel.sent) * 100).toFixed(1) : '0';

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
      {!hideTitle && <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Campaign Performance & Funnel</h3>}
      
      {/* Centered Vertical Funnel Waterfall */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 0' }}>
        {stages.map((stage, idx) => {
          const sentValue = stages[0].value || 1;
          // Calculate proportional width between 35% and 100% based on value dropoff
          const relativeWidth = Math.max(35, Math.min(100, (stage.value / sentValue) * 100));
          
          return (
            <React.Fragment key={stage.label}>
              {idx > 0 && (
                <div style={{ color: 'var(--text-muted)', opacity: 0.6, fontSize: '12px', margin: '2px 0', lineHeight: 1 }}>
                  ▼
                </div>
              )}
              <div 
                style={{
                  width: `${relativeWidth}%`,
                  minWidth: '220px',
                  background: 'linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-secondary) 100%)',
                  border: '1px solid var(--border-default)',
                  borderLeft: `4px solid ${stage.color}`,
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {stage.label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {idx === 0 ? 'Total Audience' : `${stage.pct}% conversion`}
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stage.value}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{
        marginTop: '8px',
        padding: '12px 16px',
        background: 'var(--primary-lighter)',
        color: 'var(--primary)',
        borderRadius: '6px',
        fontWeight: 600,
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <span>Conversion Rate: {convRate}%</span>
        <span>ROI: {revenue?.roi || '0%'}</span>
        <span>Revenue: ₹{(revenue?.total_attributed_amount || revenue?.total_attributed || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
