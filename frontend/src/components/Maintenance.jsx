import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Maintenance({ token, userRole }) {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [startDate, setStartDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      const [logsRes, vehiclesRes] = await Promise.all([
        fetch(`${API_URL}/maintenance`, { headers }),
        fetch(`${API_URL}/vehicles`, { headers })
      ]);

      if (!logsRes.ok || !vehiclesRes.ok) {
        throw new Error('Failed to load maintenance logs.');
      }

      const logsData = await logsRes.json();
      const vehiclesData = await vehiclesRes.json();

      setLogs(logsData);
      setVehicles(vehiclesData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter vehicles that can be sent to maintenance (Available ones)
  const availableVehicles = vehicles.filter(v => v.status === 'Available');

  const handleSendToShop = async (e) => {
    e.preventDefault();
    if (!selectedVehicleId || !description || cost === undefined) {
      alert('Please fill in vehicle, description, and repair cost.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const response = await fetch(`${API_URL}/maintenance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          description,
          cost: Number(cost),
          startDate: startDate || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create maintenance ticket.');
      }

      // Reset Form
      setSelectedVehicleId('');
      setDescription('');
      setCost('');
      setStartDate('');

      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseTicket = async (id) => {
    if (!window.confirm('Are you sure you want to close this repair ticket and release the vehicle?')) return;
    try {
      const response = await fetch(`${API_URL}/maintenance/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to close maintenance ticket.');
      }
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const isManager = userRole === 'Fleet Manager';

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>Maintenance Log & Workshop</h2>
          <p className="subtitle">Send vehicles to the repair shop, record costs, and track repair lifecycles</p>
        </div>
      </div>

      {!isManager && (
        <div className="info-banner warning-banner">
          ⚠️ Workshop Access: You are logged in as a <strong>{userRole}</strong>. 
          Only <strong>Fleet Managers</strong> are authorized to create or resolve maintenance tickets.
        </div>
      )}

      {error && <div className="error-alert">{error}</div>}

      <div className="dispatcher-split-layout">
        {/* Left: Schedule Maintenance form */}
        <div className="dispatcher-form-panel">
          <h3>Schedule Maintenance</h3>
          <p className="panel-subtitle">Create a repair log entry and move a vehicle to the "In Shop" pool</p>

          <form onSubmit={handleSendToShop} className="dispatcher-form">
            <div className="form-group">
              <label>Select Active Vehicle *</label>
              <select 
                required 
                disabled={!isManager}
                value={selectedVehicleId} 
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                <option value="">-- Choose Vehicle --</option>
                {availableVehicles.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber} - {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Service Description *</label>
              <textarea
                required
                disabled={!isManager}
                rows="4"
                placeholder="Describe engine issues, oil changes, tire repairs, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Estimated Repair Cost ($) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={!isManager}
                  placeholder="e.g. 250"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>

              <div className="form-group flex-1">
                <label>Repair Start Date</label>
                <input
                  type="date"
                  disabled={!isManager}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="accent-action-btn w-full"
              disabled={!isManager || !selectedVehicleId}
            >
              Send to Repair Shop
            </button>
          </form>
        </div>

        {/* Right: Active Maintenance Logs */}
        <div className="dispatcher-list-panel flex-2">
          <h3>Workshop Logs</h3>
          <p className="panel-subtitle">History of fleet maintenance records and active shop jobs</p>

          {loading && logs.length === 0 ? (
            <div className="loading-state">Loading maintenance logs...</div>
          ) : logs.length === 0 ? (
            <div className="empty-state">No maintenance tickets recorded.</div>
          ) : (
            <div className="table-responsive">
              <table className="flat-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Service description</th>
                    <th className="numeric">Cost</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isOpen = log.status === 'Open';

                    return (
                      <tr key={log._id}>
                        <td className="font-bold">{log.vehicle?.registrationNumber || 'N/A'}</td>
                        <td>{log.description}</td>
                        <td className="numeric">${log.cost.toLocaleString()}</td>
                        <td className="numeric">{log.startDate ? log.startDate.substring(0, 10) : 'N/A'}</td>
                        <td className="numeric">
                          {log.endDate ? log.endDate.substring(0, 10) : '—'}
                        </td>
                        <td>
                          <span className={`status-badge ${isOpen ? 'in-shop' : 'available'}`}>
                            {isOpen ? 'In Shop' : 'Completed'}
                          </span>
                        </td>
                        {isManager && (
                          <td style={{ textAlign: 'right' }}>
                            {isOpen && (
                              <button 
                                className="table-btn-edit" 
                                style={{ background: 'var(--status-available-bg)', color: 'var(--status-available)', borderColor: 'var(--status-available-border)' }}
                                onClick={() => handleCloseTicket(log._id)}
                              >
                                Close Ticket
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Maintenance;
