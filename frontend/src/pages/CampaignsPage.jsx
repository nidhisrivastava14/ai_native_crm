import React, { useState, useEffect } from 'react';
import { ConversionFunnel } from '../components/AnalyticsCards';
import { Eye, Plus, Download, X } from 'lucide-react';
import { exportAllCampaigns } from '../utils/exportCSV';

export default function CampaignsPage({ onNavigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    // fetch('/api/campaigns')
    fetch(`${import.meta.env.VITE_API_URL}/api/campaigns`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.campaigns || []);
        setCampaigns(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleRowClick = (campaignId) => {
    setSelectedFunnel(null);
    fetch(`${import.meta.env.VITE_API_URL}/api/analytics/funnel/${campaignId}`)
    // fetch(`/api/analytics/funnel/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch funnel stats');
        return res.json();
      })
      .then((data) => {
        setSelectedFunnel(data);
        setIsPanelOpen(true);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Campaign History</h1>
          <p className="page-subtitle">Track performance and ROI across all campaigns</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => exportAllCampaigns(campaigns)}
            className="btn btn-export"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--blue-500)', color: 'white' }}
          >
            <Download size={16} />
            Export to CSV
          </button>
          
          <button
            className="btn"
            onClick={() => onNavigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            Create Campaign
          </button>
        </div>
      </div>

      <div className="scrollable" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', paddingRight: '8px' }}>
        <div style={{ display: 'flex', gap: isPanelOpen ? '24px' : '0px', width: '100%', alignItems: 'start', transition: 'all 0.3s ease' }}>
          {/* Campaigns Table Card */}
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minWidth: 0, transition: 'all 0.3s ease' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Campaign History</h3>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="spinner" />
              </div>
            ) : error ? (
              <div className="message-error" style={{ padding: '16px', margin: '16px', borderRadius: '8px' }}>
                Error: {error}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Campaign Name</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Channel</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Sent</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Delivered</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Opened</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Clicked</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>Revenue</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>ROI</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((camp) => (
                      <tr
                        key={camp.id}
                        onClick={() => handleRowClick(camp.id)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: selectedFunnel?.campaign_id === camp.id ? 'var(--primary-lighter)' : 'inherit',
                        }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px 20px', fontWeight: 500 }}>
                          {camp.segment_name}
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, marginTop: '2px' }}>
                            Created: {new Date(camp.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {camp.channel}
                        </td>
                        <td style={{ padding: '16px 20px' }}>{camp.total_sent || 0}</td>
                        <td style={{ padding: '16px 20px' }}>{camp.total_delivered || 0}</td>
                        <td style={{ padding: '16px 20px' }}>{camp.total_opened || 0}</td>
                        <td style={{ padding: '16px 20px' }}>{camp.total_clicked || 0}</td>
                        <td style={{ padding: '16px 20px' }}>₹{(camp.revenue || 0).toLocaleString()}</td>
                        <td style={{ padding: '16px 20px' }}>{camp.roi > 999 ? '999%+' : `${camp.roi || 0}%`}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button
                            className="btn secondary"
                            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(camp.id);
                            }}
                          >
                            <Eye size={12} />
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No campaigns found. Create your first one from the Dashboard!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Collapsible Funnel Breakdown Panel */}
          <div 
            style={{
              width: isPanelOpen ? '400px' : '0px',
              opacity: isPanelOpen ? 1 : 0,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: isPanelOpen ? 'auto' : 'hidden',
              transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'sticky',
              top: '0px',
              padding: isPanelOpen ? '20px' : '0px',
              background: 'var(--bg-card)',
              border: isPanelOpen ? '1px solid var(--border)' : '0px solid transparent',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {selectedFunnel && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Performance Funnel</h3>
                  <button 
                    onClick={() => setIsPanelOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px',
                      borderRadius: '50%',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <X size={16} />
                  </button>
                </div>
                <ConversionFunnel funnel={selectedFunnel.funnel} revenue={selectedFunnel.revenue} hideTitle={true} />
                <button
                  className="btn secondary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={() => setIsPanelOpen(false)}
                >
                  Close Panel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) to Re-open Funnel when collapsed */}
      {selectedFunnel && !isPanelOpen && (
        <button
          className="btn"
          onClick={() => setIsPanelOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-full)',
            padding: '12px 20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--blue-500)',
            color: 'white',
          }}
        >
          <Eye size={18} />
          Show Performance Funnel
        </button>
      )}
    </div>
  );
}
