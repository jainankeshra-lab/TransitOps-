import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Reports({ token }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await fetch(`${API_URL}/reports/analytics`, { headers });
      if (!response.ok) throw new Error('Failed to load fleet analytics.');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCSV = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${API_URL}/reports/export-csv`, { headers });
      
      if (!response.ok) throw new Error('Failed to generate CSV export.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transitops-fleet-report-${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && analytics.length === 0) {
    return <div className="loading-state">Compiling fleet analytics...</div>;
  }

  // Calculate global stats
  const totalOperationalCost = analytics.reduce((acc, a) => acc + a.totalCost, 0);
  const totalRevenue = analytics.reduce((acc, a) => acc + a.totalRevenue, 0);
  
  const totalDistance = analytics.reduce((acc, a) => acc + a.totalDistance, 0);
  const totalLiters = analytics.reduce((acc, a) => acc + a.fuelLiters, 0);
  const averageFuelEfficiency = totalLiters > 0 
    ? Math.round((totalDistance / totalLiters) * 100) / 100 
    : 0;

  const totalAcquisitionCost = analytics.reduce((acc, a) => acc + a.acquisitionCost, 0);
  const averageROI = totalAcquisitionCost > 0
    ? Math.round(((totalRevenue - totalOperationalCost) / totalAcquisitionCost) * 10000) / 100
    : 0;

  // Render variables for custom SVGs
  const maxRoiVal = Math.max(...analytics.map(a => Math.abs(a.roi) || 10), 10);
  const maxCostVal = Math.max(...analytics.map(a => a.totalCost || 1000), 1000);

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>Operational Reports & ROI Analytics</h2>
          <p className="subtitle">Audit fuel efficiency, track vehicle yields, and download CSV spreadsheets</p>
        </div>
        <button className="accent-action-btn" onClick={handleExportCSV}>
          📥 Export Report (CSV)
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Analytics KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Cumulative Revenue</span>
          <span className="kpi-val numeric">${totalRevenue.toLocaleString()}</span>
          <span className="kpi-footer">From completed routes</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Operational Costs</span>
          <span className="kpi-val numeric warning">${totalOperationalCost.toLocaleString()}</span>
          <span className="kpi-footer">Fuel + maintenance + expenses</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Average Fuel Efficiency</span>
          <span className="kpi-val numeric">{averageFuelEfficiency} km/L</span>
          <span className="kpi-footer">Distance to fuel ratio</span>
        </div>
        <div className="kpi-card highlight">
          <span className="kpi-label">Average Fleet ROI</span>
          <span className="kpi-val numeric" style={{ color: averageROI >= 0 ? 'var(--status-available)' : 'var(--status-retired)' }}>
            {averageROI}%
          </span>
          <span className="kpi-footer">Net yields vs asset acquisition</span>
        </div>
      </div>

      {/* Visual Graphs Sections */}
      <div className="dashboard-sections">
        {/* Custom SVG ROI Bar Chart */}
        <div className="section-panel flex-1">
          <h3>Vehicle ROI (%) Comparison</h3>
          <p className="panel-subtitle">Asset yields calculated from cumulative revenues and total overheads</p>
          <div className="svg-chart-container" style={{ marginTop: '1.5rem' }}>
            {analytics.length === 0 ? (
              <div className="empty-state">No vehicle metrics available.</div>
            ) : (
              <svg viewBox="0 0 500 240" className="analytics-svg">
                {/* Horizontal grid lines */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="40" y1="110" x2="480" y2="110" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="40" y1="190" x2="480" y2="190" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
                
                {/* Center Baseline 0% */}
                <line x1="40" y1="110" x2="480" y2="110" stroke="var(--text-secondary)" strokeWidth="1" />

                {/* Vertical Axis line */}
                <line x1="40" y1="20" x2="40" y2="200" stroke="var(--border-color)" strokeWidth="1" />

                {/* Y-axis Labels */}
                <text x="35" y="34" fill="var(--text-secondary)" fontSize="9" textAnchor="end">+{maxRoiVal}%</text>
                <text x="35" y="114" fill="var(--text-secondary)" fontSize="9" textAnchor="end">0%</text>
                <text x="35" y="194" fill="var(--text-secondary)" fontSize="9" textAnchor="end">-${maxRoiVal}%</text>

                {/* Bars */}
                {analytics.map((item, idx) => {
                  const numItems = analytics.length;
                  const spacing = 440 / numItems;
                  const barWidth = Math.min(30, spacing * 0.6);
                  const x = 50 + idx * spacing;
                  
                  // Calculate height relative to max value
                  const maxBarHeight = 80;
                  const heightRatio = item.roi / maxRoiVal;
                  const barHeight = Math.abs(heightRatio * maxBarHeight);
                  
                  // Y coordinate changes based on positive/negative ROI
                  const y = item.roi >= 0 ? 110 - barHeight : 110;
                  
                  const isPositive = item.roi >= 0;
                  const fillClass = isPositive ? 'chart-bar-positive' : 'chart-bar-negative';

                  return (
                    <g key={item._id}>
                      {/* Bar Rect */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, barHeight)}
                        rx="2"
                        className={fillClass}
                      />
                      {/* Label under or above the bar */}
                      <text
                        x={x + barWidth / 2}
                        y={isPositive ? 104 - barHeight : 124 + barHeight}
                        fill="var(--text-primary)"
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {item.roi}%
                      </text>
                      {/* Vehicle registration text */}
                      <text
                        x={x + barWidth / 2}
                        y="215"
                        fill="var(--text-secondary)"
                        fontSize="8"
                        textAnchor="middle"
                      >
                        {item.registrationNumber}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Custom SVG Operational Cost comparison */}
        <div className="section-panel flex-1">
          <h3>Total Expenses per Vehicle ($)</h3>
          <p className="panel-subtitle">Total operations costs split by asset type and overhead category</p>
          <div className="svg-chart-container" style={{ marginTop: '1.5rem' }}>
            {analytics.length === 0 ? (
              <div className="empty-state">No vehicle cost profiles found.</div>
            ) : (
              <svg viewBox="0 0 500 240" className="analytics-svg">
                {/* Vertical grid lines */}
                <line x1="120" y1="20" x2="120" y2="190" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="300" y1="20" x2="300" y2="190" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="480" y1="20" x2="480" y2="190" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />

                {/* Horizontal Axis lines */}
                <line x1="100" y1="190" x2="480" y2="190" stroke="var(--text-secondary)" strokeWidth="1" />

                {/* X-axis Labels */}
                <text x="120" y="205" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">$0</text>
                <text x="300" y="205" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">${Math.round(maxCostVal / 2).toLocaleString()}</text>
                <text x="480" y="205" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">${maxCostVal.toLocaleString()}</text>

                {/* Horizontal Bars */}
                {analytics.map((item, idx) => {
                  const numItems = analytics.length;
                  const spacing = 160 / numItems;
                  const barHeight = Math.min(18, spacing * 0.7);
                  const y = 25 + idx * spacing;
                  
                  // Calculate width relative to max value
                  const maxWidth = 380;
                  const costRatio = item.totalCost / maxCostVal;
                  const barWidth = Math.max(5, costRatio * maxWidth);

                  return (
                    <g key={item._id}>
                      {/* Vehicle Registry Label */}
                      <text
                        x="90"
                        y={y + barHeight / 2 + 3}
                        fill="var(--text-primary)"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        {item.registrationNumber}
                      </text>
                      {/* Bar Rect */}
                      <rect
                        x="100"
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="2"
                        className="chart-bar-horizontal"
                      />
                      {/* Cost value text */}
                      <text
                        x={100 + barWidth + 6}
                        y={y + barHeight / 2 + 3}
                        fill="var(--text-secondary)"
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="start"
                      >
                        ${item.totalCost.toLocaleString()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Summary Table showing raw details */}
      <div className="section-panel" style={{ marginTop: '2.5rem' }}>
        <h3>Fleet Operational Statistics Ledger</h3>
        <div className="table-responsive">
          <table className="flat-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Type</th>
                <th className="numeric">Distance Covered</th>
                <th className="numeric">Total Revenue</th>
                <th className="numeric">Fuel Cost</th>
                <th className="numeric">Maintenance Cost</th>
                <th className="numeric">Fuel Efficiency</th>
                <th className="numeric">Yield (ROI)</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((item) => (
                <tr key={item._id}>
                  <td className="font-bold uppercase">{item.registrationNumber}</td>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td className="numeric">{item.totalDistance.toLocaleString()} km</td>
                  <td className="numeric">${item.totalRevenue.toLocaleString()}</td>
                  <td className="numeric">${item.fuelCost.toLocaleString()}</td>
                  <td className="numeric">${item.maintenanceCost.toLocaleString()}</td>
                  <td className="numeric">{item.fuelEfficiency} km/L</td>
                  <td className="numeric font-bold" style={{ color: item.roi >= 0 ? 'var(--status-available)' : 'var(--status-retired)' }}>
                    {item.roi}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;
