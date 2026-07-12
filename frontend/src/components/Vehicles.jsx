import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Vehicles({ token, userRole }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  // Modal Control
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');

  // Form Fields
  const [regNum, setRegNum] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Van');
  const [capacity, setCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [region, setRegion] = useState('Central');
  const [status, setStatus] = useState('Available');

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      // Build parameters
      const params = [];
      if (search) params.push(`search=${search}`);
      if (filterType) params.push(`type=${filterType}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (filterRegion) params.push(`region=${filterRegion}`);
      const query = params.length > 0 ? '?' + params.join('&') : '';

      const response = await fetch(`${API_URL}/vehicles${query}`, { headers });
      if (!response.ok) throw new Error('Failed to load fleet assets.');
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, filterType, filterStatus, filterRegion]);

  const openAddModal = () => {
    setIsEdit(false);
    setRegNum('');
    setName('');
    setType('Van');
    setCapacity('');
    setOdometer('');
    setCost('');
    setRegion('Central');
    setStatus('Available');
    setShowModal(true);
  };

  const openEditModal = (vehicle) => {
    setIsEdit(true);
    setEditId(vehicle._id);
    setRegNum(vehicle.registrationNumber);
    setName(vehicle.name);
    setType(vehicle.type);
    setCapacity(vehicle.maxCapacity);
    setOdometer(vehicle.odometer);
    setCost(vehicle.acquisitionCost);
    setRegion(vehicle.region || 'Central');
    setStatus(vehicle.status);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!regNum || !name || !capacity || !cost) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      
      const payload = {
        registrationNumber: regNum,
        name,
        type,
        maxCapacity: Number(capacity),
        odometer: odometer ? Number(odometer) : 0,
        acquisitionCost: Number(cost),
        region,
        status
      };

      const url = isEdit ? `${API_URL}/vehicles/${editId}` : `${API_URL}/vehicles`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save vehicle.');
      }

      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle from the registry?')) return;
    try {
      const response = await fetch(`${API_URL}/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete vehicle.');
      }
      fetchVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const isManager = userRole === 'Fleet Manager';

  return (
    <div className="view-container">
      {/* Top Header Controls */}
      <div className="view-header">
        <div>
          <h2>Vehicle Registry</h2>
          <p className="subtitle">Manage vehicle details, types, capacities, and regions</p>
        </div>
        <button 
          className="accent-action-btn"
          disabled={!isManager}
          onClick={openAddModal}
          title={!isManager ? "Only Fleet Managers can register vehicles" : ""}
        >
          + Register Vehicle
        </button>
      </div>

      {!isManager && (
        <div className="info-banner warning-banner">
          ⚠️ Operational Note: You are logged in as a <strong>{userRole}</strong>. 
          Only <strong>Fleet Managers</strong> are authorized to create, edit, or delete vehicles.
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="search-filter-panel">
        <input
          type="text"
          className="search-input"
          placeholder="Search by reg number or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="dropdowns-panel">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Sedan">Sedan</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
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

      {error && <div className="error-alert">{error}</div>}

      {/* Vehicles Table */}
      {loading && vehicles.length === 0 ? (
        <div className="loading-state">Loading registry list...</div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state">No vehicles found matching search criteria.</div>
      ) : (
        <div className="table-responsive">
          <table className="flat-table">
            <thead>
              <tr>
                <th>Reg Number</th>
                <th>Vehicle Model</th>
                <th>Type</th>
                <th className="numeric">Max Capacity</th>
                <th className="numeric">Odometer</th>
                <th className="numeric">Acquisition Cost</th>
                <th>Region</th>
                <th>Status</th>
                {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                let statusClass = 'available';
                if (vehicle.status === 'On Trip') statusClass = 'on-trip';
                if (vehicle.status === 'In Shop') statusClass = 'in-shop';
                if (vehicle.status === 'Retired') statusClass = 'retired';

                return (
                  <tr key={vehicle._id}>
                    <td className="numeric font-bold uppercase">{vehicle.registrationNumber}</td>
                    <td>{vehicle.name}</td>
                    <td>{vehicle.type}</td>
                    <td className="numeric">{vehicle.maxCapacity.toLocaleString()} kg</td>
                    <td className="numeric">{vehicle.odometer.toLocaleString()} km</td>
                    <td className="numeric">${vehicle.acquisitionCost.toLocaleString()}</td>
                    <td>{vehicle.region}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    {isManager && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button className="table-btn-edit" onClick={() => openEditModal(vehicle)}>Edit</button>
                          <button 
                            className="table-btn-delete" 
                            disabled={vehicle.status === 'On Trip'}
                            onClick={() => handleDelete(vehicle._id)}
                            title={vehicle.status === 'On Trip' ? 'Cannot delete vehicle while on trip' : ''}
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

      {/* Register/Edit Vehicle Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{isEdit ? 'Update Vehicle Details' : 'Register New Fleet Asset'}</h3>
            <form onSubmit={handleSave} className="modal-form">
              <div className="modal-form-grid">
                <div className="form-group">
                  <label>Registration Number (Unique) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VAN-05"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    disabled={isEdit}
                  />
                </div>
                <div className="form-group">
                  <label>Vehicle Model / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ford Transit"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Asset Type *</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Sedan">Sedan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Load Capacity (kg) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Current Odometer (km)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 12000"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Acquisition Cost ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Operating Region</label>
                  <select value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="Central">Central</option>
                    <option value="National">National</option>
                  </select>
                </div>
                {isEdit && (
                  <div className="form-group">
                    <label>Operational Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="Available">Available</option>
                      <option value="On Trip">On Trip</option>
                      <option value="In Shop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;
