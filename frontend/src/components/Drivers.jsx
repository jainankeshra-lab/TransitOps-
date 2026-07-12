import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Drivers({ token, userRole, hasPermission }) {
  const [drivers, setDrivers] = useState([]);
  const [tripCounts, setTripCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal Control
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [licenseCat, setLicenseCat] = useState('Commercial');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [safetyScore, setSafetyScore] = useState(100);
  const [status, setStatus] = useState('Available');

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      const params = [];
      if (search) params.push(`search=${search}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      const query = params.length > 0 ? '?' + params.join('&') : '';

      const [driversRes, tripsRes] = await Promise.all([
        fetch(`${API_URL}/drivers${query}`, { headers }),
        fetch(`${API_URL}/trips`, { headers })
      ]);

      if (!driversRes.ok) throw new Error('Failed to load driver profiles.');
      const driversData = await driversRes.json();
      setDrivers(driversData);

      // Compute completed trips per driver
      if (tripsRes.ok) {
        const tripsData = await tripsRes.json();
        const counts = {};
        tripsData.forEach(trip => {
          if (trip.status === 'Completed' && trip.driver) {
            const driverId = typeof trip.driver === 'object' ? trip.driver._id : trip.driver;
            counts[driverId] = (counts[driverId] || 0) + 1;
          }
        });
        setTripCounts(counts);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [search, filterStatus]);

  const openAddModal = () => {
    setIsEdit(false);
    setName('');
    setLicenseNum('');
    setLicenseCat('Commercial');
    setLicenseExpiry('');
    setContact('');
    setEmail('');
    setSafetyScore(100);
    setStatus('Available');
    setShowModal(true);
  };

  const openEditModal = (driver) => {
    setIsEdit(true);
    setEditId(driver._id);
    setName(driver.name);
    setLicenseNum(driver.licenseNumber);
    setLicenseCat(driver.licenseCategory);
    
    // Format Date string for input tag
    const dateStr = driver.licenseExpiry ? driver.licenseExpiry.substring(0, 10) : '';
    setLicenseExpiry(dateStr);
    
    setContact(driver.contact);
    setEmail(driver.email || '');
    setSafetyScore(driver.safetyScore);
    setStatus(driver.status);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !licenseNum || !licenseCat || !licenseExpiry || !contact) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const payload = {
        name,
        licenseNumber: licenseNum,
        licenseCategory: licenseCat,
        licenseExpiry,
        contact,
        email,
        safetyScore: Number(safetyScore),
        status
      };

      const url = isEdit ? `${API_URL}/drivers/${editId}` : `${API_URL}/drivers`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save driver profile.');
      }

      setShowModal(false);
      fetchDrivers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this driver profile?')) return;
    try {
      const response = await fetch(`${API_URL}/drivers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete driver.');
      }
      fetchDrivers();
    } catch (err) {
      alert(err.message);
    }
  };

  // Helper check for license expiration
  const checkLicenseStatus = (expiryDateStr) => {
    if (!expiryDateStr) return { label: 'Unknown', className: 'text-secondary' };
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Expired', class: 'expired-badge', warning: true };
    } else if (diffDays <= 30) {
      return { label: 'Expiring Soon', class: 'expiring-badge', warning: true };
    }
    return { label: 'Valid', class: 'valid-badge', warning: false };
  };

  const isAuthorized = hasPermission ? hasPermission(userRole, 'Register/Edit Drivers Profiles') : (userRole === 'Fleet Manager' || userRole === 'Safety Officer');

  const [alerting, setAlerting] = useState(false);
  const [alertingFeedback, setAlertingFeedback] = useState('');

  const handleTriggerAlerts = async () => {
    try {
      setAlerting(true);
      setAlertingFeedback('');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      const res = await fetch(`${API_URL}/drivers/send-expiry-alerts`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger alerts');
      
      const sentCount = data.logs ? data.logs.filter(l => l.success).length : 0;
      setAlertingFeedback(`✉️ Checked! Dispatched ${sentCount} expiration warning emails.`);
      setTimeout(() => setAlertingFeedback(''), 5000);
    } catch (err) {
      alert(err.message);
    } finally {
      setAlerting(false);
    }
  };

  return (
    <div className="view-container">
      {/* Top Header Controls */}
      <div className="view-header">
        <div>
          <h2>Drivers & Safety Profiles</h2>
          <p className="subtitle">Track license expirations, compliance indicators, and safety scores</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="secondary-btn"
            disabled={!isAuthorized || alerting}
            onClick={handleTriggerAlerts}
            title={!isAuthorized ? "Only Fleet Managers or Safety Officers can trigger alerts" : ""}
          >
            {alerting ? 'Sending Alert Emails...' : '✉️ Send Expiry Alerts'}
          </button>
          <button 
            className="accent-action-btn"
            disabled={!isAuthorized}
            onClick={openAddModal}
            title={!isAuthorized ? "Only Fleet Managers or Safety Officers can register drivers" : ""}
          >
            + Add Driver
          </button>
        </div>
      </div>

      {alertingFeedback && (
        <div className="auth-success-alert" style={{ marginBottom: '1.25rem' }}>
          {alertingFeedback}
        </div>
      )}

      {!isAuthorized && (
        <div className="info-banner warning-banner">
          ⚠️ Compliance Note: You are logged in as a <strong>{userRole}</strong>. 
          Only <strong>authorized profiles</strong> with 'Register/Edit Drivers Profiles' permission can register or update driver profiles.
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filter-panel">
        <input
          type="text"
          className="search-input"
          placeholder="Search drivers by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="dropdowns-panel">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Drivers List Table */}
      {loading && drivers.length === 0 ? (
        <div className="loading-state">Loading driver records...</div>
      ) : drivers.length === 0 ? (
        <div className="empty-state">No driver profiles found.</div>
      ) : (
        <div className="table-responsive">
          <table className="flat-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License Number</th>
                <th>Category</th>
                <th>License Expiry</th>
                <th>Compliance Status</th>
                <th>Contact</th>
                <th>Email</th>
                <th className="numeric">Safety Score</th>
                <th className="numeric">Trips Done</th>
                <th>Status</th>
                {isAuthorized && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const licStatus = checkLicenseStatus(driver.licenseExpiry);
                
                let statusClass = 'available';
                if (driver.status === 'On Trip') statusClass = 'on-trip';
                if (driver.status === 'Off Duty') statusClass = 'retired';
                if (driver.status === 'Suspended') statusClass = 'suspended';

                // Safety score indicator color
                let safetyColorClass = 'text-success';
                if (driver.safetyScore < 85) safetyColorClass = 'text-warning';
                if (driver.safetyScore < 70) safetyColorClass = 'text-danger';

                return (
                  <tr key={driver._id}>
                    <td className="font-bold">{driver.name}</td>
                    <td className="numeric">{driver.licenseNumber}</td>
                    <td>{driver.licenseCategory}</td>
                    <td className="numeric">
                      {driver.licenseExpiry ? driver.licenseExpiry.substring(0, 10) : 'N/A'}
                    </td>
                    <td>
                      <span className={`lic-badge ${licStatus.class}`}>
                        {licStatus.label}
                      </span>
                    </td>
                    <td>{driver.contact}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {driver.email ? (
                        <a href={`mailto:${driver.email}`} style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
                          {driver.email}
                        </a>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className={`numeric font-bold ${safetyColorClass}`}>
                      {driver.safetyScore} / 100
                    </td>
                    <td className="numeric">
                      <span className="trips-done-badge">
                        {tripCounts[driver._id] || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {driver.status}
                      </span>
                    </td>
                    {isAuthorized && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button className="table-btn-edit" onClick={() => openEditModal(driver)}>Edit</button>
                          <button 
                            className="table-btn-delete"
                            disabled={driver.status === 'On Trip'}
                            onClick={() => handleDelete(driver._id)}
                            title={driver.status === 'On Trip' ? 'Cannot remove driver while on trip' : ''}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Driver Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{isEdit ? 'Update Driver Profile' : 'Register New Driver'}</h3>
            <form onSubmit={handleSave} className="modal-form">
              <div className="modal-form-grid">
                <div className="form-group">
                  <label>Driver Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-983274"
                    value={licenseNum}
                    onChange={(e) => setLicenseNum(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>License Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class A Commercial"
                    value={licenseCat}
                    onChange={(e) => setLicenseCat(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>License Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 555-0100"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. driver@transitops.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Safety Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 95"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Operating Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Drivers;
