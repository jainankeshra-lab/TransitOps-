import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function RBACSettings({ token }) {
  
  // Matrix definitions matching mockup flow
  const rolesInfo = [
    {
      role: 'Fleet Manager',
      desc: 'Full administrative access. Oversees fleet assets, vehicle lifecycle, maintenance repairs, and operational profitability.',
      color: 'var(--status-trip)'
    },
    {
      role: 'Driver',
      desc: 'Creates dispatch trips, assigns drivers and vehicles, and updates active delivery status records.',
      color: 'var(--status-available)'
    },
    {
      role: 'Safety Officer',
      desc: 'Monitors driver files, compliance indices, driving history logs, and driving license expirations.',
      color: 'var(--status-shop)'
    },
    {
      role: 'Financial Analyst',
      desc: 'Financial ledger auditor. Enters fuel/toll receipts, reviews operational cost statistics, and audits vehicle yields.',
      color: 'var(--accent-color)'
    }
  ];

  const defaultMatrix = [
    { feature: 'View Dashboard KPIs', manager: true, driver: true, safety: true, analyst: true },
    { feature: 'Register/Edit Fleet Vehicles', manager: true, driver: false, safety: false, analyst: false },
    { feature: 'Register/Edit Drivers Profiles', manager: true, driver: false, safety: true, analyst: false },
    { feature: 'Create/Draft Dispatches', manager: true, driver: true, safety: false, analyst: false },
    { feature: 'Dispatch Active Trips', manager: true, driver: true, safety: false, analyst: false },
    { feature: 'Complete/Cancel Trips', manager: true, driver: true, safety: false, analyst: false },
    { feature: 'Schedule Maintenance Logs', manager: true, driver: false, safety: false, analyst: false },
    { feature: 'Close Maintenance Tickets', manager: true, driver: false, safety: false, analyst: false },
    { feature: 'Log Fuel refills & Expenses', manager: true, driver: false, safety: false, analyst: true },
    { feature: 'View Financial Yields & ROI Reports', manager: true, driver: true, safety: true, analyst: true },
    { feature: 'Export Report Spreadsheets (CSV)', manager: true, driver: true, safety: true, analyst: true }
  ];

  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/rbac`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load RBAC configurations from server.');
      const data = await response.json();
      setMatrix(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [token]);

  const handleToggle = (rowIndex, roleKey) => {
    const updated = [...matrix];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [roleKey]: !updated[rowIndex][roleKey]
    };
    setMatrix(updated);
  };

  const handleSaveChanges = async () => {
    try {
      setError('');
      setSuccessMessage('');
      const response = await fetch(`${API_URL}/rbac`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: matrix })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save settings to server.');
      
      setMatrix(data.permissions);
      setSuccessMessage('RBAC changes saved successfully to MongoDB. Live policy controls applied.');
      
      // Dispatch custom event to notify parent App.jsx component
      window.dispatchEvent(new Event('rbac-updated'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetDefaults = async () => {
    try {
      setError('');
      setSuccessMessage('');
      const response = await fetch(`${API_URL}/rbac`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: defaultMatrix })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset settings on server.');
      
      setMatrix(data.permissions);
      setSuccessMessage('Permissions reset to system defaults in MongoDB.');
      window.dispatchEvent(new Event('rbac-updated'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && matrix.length === 0) {
    return <div className="loading-state">Loading system matrix from MongoDB...</div>;
  }

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>System Permissions & Settings</h2>
          <p className="subtitle">Manage security grids and capabilities matrix configured for TransitOps roles</p>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}
      {successMessage && <div className="db-badge" style={{ marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>✓ {successMessage}</div>}

      <div className="dispatcher-split-layout" style={{ marginTop: '1rem' }}>
        {/* Left Side: Role details card list */}
        <div className="dispatcher-form-panel flex-1">
          <h3>Role Descriptions</h3>
          <p className="panel-subtitle">Access scopes configured for TransitOps roles</p>

          <div className="roles-info-list" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rolesInfo.map((info) => (
              <div key={info.role} className="role-info-card" style={{ borderLeft: `3px solid ${info.color}`, background: 'var(--surface-header)', padding: '1rem', borderRadius: '4px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{info.role}</strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: '1.4' }}>
                  {info.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Matrix list */}
        <div className="dispatcher-list-panel flex-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Capabilities Grid (RBAC Matrix)</h3>
              <p className="panel-subtitle">Toggle permissions and save to apply changes globally</p>
            </div>
            <button 
              type="button" 
              className="secondary-btn" 
              onClick={handleResetDefaults}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              Reset Defaults
            </button>
          </div>

          <div className="table-responsive" style={{ marginTop: '1.25rem' }}>
            <table className="flat-table">
              <thead>
                <tr>
                  <th>Resource Scope</th>
                  <th style={{ textAlign: 'center' }}>Manager</th>
                  <th style={{ textAlign: 'center' }}>Driver</th>
                  <th style={{ textAlign: 'center' }}>Safety</th>
                  <th style={{ textAlign: 'center' }}>Analyst</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((perm, idx) => (
                  <tr key={idx}>
                    <td className="font-bold" style={{ fontSize: '0.85rem' }}>{perm.feature}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={perm.manager} 
                        onChange={() => handleToggle(idx, 'manager')}
                        style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: 'var(--accent-color)' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={perm.driver} 
                        onChange={() => handleToggle(idx, 'driver')}
                        style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: 'var(--accent-color)' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={perm.safety} 
                        onChange={() => handleToggle(idx, 'safety')}
                        style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: 'var(--accent-color)' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={perm.analyst} 
                        onChange={() => handleToggle(idx, 'analyst')}
                        style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: 'var(--accent-color)' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="accent-action-btn" 
              onClick={handleSaveChanges}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RBACSettings;
