import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Dashboard({ token }) {
  const [kpis, setKpis] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // 1. Build Query String
      let query = '';
      const params = [];
      if (filterType) params.push(`type=${filterType}`);
      if (filterRegion) params.push(`region=${filterRegion}`);
      if (params.length > 0) query = '?' + params.join('&');

      // 2. Fetch KPIs
      const kpiRes = await fetch(`${API_URL}/reports/dashboard${query}`, { headers });
      if (!kpiRes.ok) throw new Error('Failed to load KPIs.');
      const kpiData = await kpiRes.json();
      setKpis(kpiData.kpis);

      // 3. Fetch all active trips
      const tripsRes = await fetch(`${API_URL}/trips`, { headers });
      if (!tripsRes.ok) throw new Error('Failed to load active dispatches.');
      const tripsData = await tripsRes.json();
      // Filter out completed and cancelled for the active display
      const active = tripsData.filter(t => t.status === 'Dispatched');
      setActiveTrips(active);

      // 4. Fetch all vehicles to compute status distribution chart
      const vehiclesRes = await fetch(`${API_URL}/vehicles${query}`, { headers });
      if (!vehiclesRes.ok) throw new Error('Failed to load vehicles list.');
      const vehiclesData = await vehiclesRes.json();
      setVehicles(vehiclesData);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, filterRegion]);

  if (loading && !kpis) {
    return <div className="loading-state">Loading dashboard data...</div>;
  }

  // Calculate status counts for local chart
  const statusCounts = {
    Available: vehicles.filter(v => v.status === 'Available').length,
    'On Trip': vehicles.filter(v => v.status === 'On Trip').length,
    'In Shop': vehicles.filter(v => v.status === 'In Shop').length,
    Retired: vehicles.filter(v => v.status === 'Retired').length,
  };

  const totalVehiclesCount = vehicles.length;

  return (
    <div className="view-container">
      {/* Top Filter Bar */}
      <div className="view-header">
        <div>
          <h2>Operational Dashboard</h2>
          <p className="subtitle">Real-time status tracking and key performance indicators</p>
        </div>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Asset Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="Truck">Truck</option>
              <option value="Van">Van</option>
              <option value="Sedan">Sedan</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Region</label>
            <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
              <option value="">All Regions</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="Central">Central</option>
              <option value="National">National</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Active Vehicles</span>
          <span className="kpi-val numeric">{kpis?.activeVehicles || 0}</span>
          <span className="kpi-footer">Currently dispatched</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Available Vehicles</span>
          <span className="kpi-val numeric">{kpis?.availableVehicles || 0}</span>
          <span className="kpi-footer">Ready for assignment</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">In Shop (Maint.)</span>
          <span className="kpi-val numeric warning">{kpis?.inMaintenanceVehicles || 0}</span>
          <span className="kpi-footer">Under active repair</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Trips</span>
          <span className="kpi-val numeric">{kpis?.activeTrips || 0}</span>
          <span className="kpi-footer">En-route deliveries</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Pending Trips</span>
          <span className="kpi-val numeric">{kpis?.pendingTrips || 0}</span>
          <span className="kpi-footer">Draft orders awaiting dispatch</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Drivers on Duty</span>
          <span className="kpi-val numeric">{kpis?.driversOnDuty || 0}</span>
          <span className="kpi-footer">Available or driving</span>
        </div>
        <div className="kpi-card highlight">
          <span className="kpi-label">Fleet Utilization</span>
          <div className="utilization-box">
            <span className="kpi-val numeric">{kpis?.fleetUtilization || 0}%</span>
            <div className="progress-bar-container mini">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${kpis?.fleetUtilization || 0}%` }}
              ></div>
            </div>
          </div>
          <span className="kpi-footer">Active vs total fleet</span>
        </div>
      </div>

      {/* Grid for Active Trips and Status Chart */}
      <div className="dashboard-sections">
        {/* Active Trips list */}
        <div className="section-panel flex-2">
          <h3>Active Trips Log</h3>
          {activeTrips.length === 0 ? (
            <div className="empty-state">No trips currently en-route.</div>
          ) : (
            <div className="table-responsive">
              <table className="flat-table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Cargo Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map((trip) => (
                    <tr key={trip._id}>
                      <td className="numeric font-bold">{trip._id.substring(18)}</td>
                      <td>{trip.driver?.name}</td>
                      <td>{trip.vehicle?.registrationNumber} ({trip.vehicle?.name})</td>
                      <td>{trip.source}</td>
                      <td>{trip.destination}</td>
                      <td className="numeric">{trip.cargoWeight} kg</td>
                      <td>
                        <span className={`status-badge on-trip`}>
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Fleet Status Chart */}
        <div className="section-panel flex-1">
          <h3>Active Fleet Status</h3>
          <div className="chart-box">
            {totalVehiclesCount === 0 ? (
              <div className="empty-state">No assets found for status breakdown.</div>
            ) : (
              <div className="status-chart-list">
                {Object.keys(statusCounts).map((statusKey) => {
                  const count = statusCounts[statusKey];
                  const percentage = totalVehiclesCount > 0 ? (count / totalVehiclesCount) * 100 : 0;
                  
                  // Compute color class matching schema
                  let statusClass = 'available';
                  if (statusKey === 'On Trip') statusClass = 'on-trip';
                  if (statusKey === 'In Shop') statusClass = 'in-shop';
                  if (statusKey === 'Retired') statusClass = 'retired';

                  return (
                    <div key={statusKey} className="chart-row">
                      <div className="chart-row-header">
                        <span className="chart-row-label">{statusKey}</span>
                        <span className="chart-row-count numeric">{count} ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className={`progress-bar-fill ${statusClass}`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
