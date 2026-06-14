import Papa from 'papaparse';

export const exportCampaignResults = (campaign) => {
  // Format data for CSV
  const csvData = [
    {
      "Campaign Name": campaign.segment_name,
      "Channel": campaign.channel,
      "Status": campaign.status,
      "Date Created": new Date(campaign.created_at).toLocaleDateString(),
      "Total Sent": campaign.total_sent || 0,
      "Total Delivered": campaign.total_delivered || 0,
      "Open Rate": `${((campaign.total_opened / (campaign.total_delivered || 1)) * 100).toFixed(1)}%`,
      "Click Rate": `${((campaign.total_clicked / (campaign.total_opened || 1)) * 100).toFixed(1)}%`,
      "Conversion Rate": `${campaign.conversion_rate || 0}%`,
      "Revenue Generated": `₹${campaign.revenue || 0}`,
      "ROI": `${campaign.roi || 0}%`
    }
  ];

  // Convert to CSV
  const csv = Papa.unparse(csvData);
  
  // Trigger download
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
  element.setAttribute('download', `campaign_${campaign.id}_${new Date().toISOString().split('T')[0]}.csv`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const exportAllCampaigns = (campaigns) => {
  const csvData = campaigns.map(c => ({
    "Campaign Name": c.segment_name,
    "Channel": c.channel,
    "Status": c.status,
    "Date": new Date(c.created_at).toLocaleDateString(),
    "Sent": c.total_sent || 0,
    "Delivered": c.total_delivered || 0,
    "Opened": c.total_opened || 0,
    "Clicked": c.total_clicked || 0,
    "Purchased": c.conversion_count || 0,
    "Revenue": `₹${c.revenue || 0}`,
    "ROI": `${c.roi || 0}%`
  }));

  const csv = Papa.unparse(csvData);
  
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
  element.setAttribute('download', `all_campaigns_${new Date().toISOString().split('T')[0]}.csv`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
