import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Vehicles({ token, userRole, hasPermission }) {
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

  // Document Management States
  const [showDocModal, setShowDocModal] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Insurance');
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const openDocModal = (vehicle) => {
    setActiveVehicle(vehicle);
    setDocName('');
    setDocCategory('Insurance');
    setDocFile(null);
    setShowDocModal(true);
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docName || !docCategory || !docFile) {
      alert('Please fill in document name, category, and select a file.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('name', docName);
      formData.append('category', docCategory);
      formData.append('document', docFile);

      const response = await fetch(`${API_URL}/vehicles/${activeVehicle._id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document.');
      }

      setActiveVehicle(data);
      setDocName('');
      setDocFile(null);
      
      // Update vehicles in state
      setVehicles(vehicles.map(v => v._id === data._id ? data : v));
      alert('Document uploaded successfully.');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`${API_URL}/vehicles/${activeVehicle._id}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete document.');
      }

      setActiveVehicle(data);
      setVehicles(vehicles.map(v => v._id === data._id ? data : v));
      alert('Document deleted successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  const isManager = hasPermission ? hasPermission(userRole, 'Register/Edit Fleet Vehicles') : (userRole === 'Fleet Manager');

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
          title={!isManager ? "Only authorized roles can register vehicles" : ""}
        >
          + Register Vehicle
        </button>
      </div>

      {!isManager && (
        <div className="info-banner warning-banner">
          ⚠️ Operational Note: You are logged in as a <strong>{userRole}</strong>. 
          Only <strong>authorized profiles</strong> with 'Register/Edit Fleet Vehicles' permission can create, edit, or delete vehicles.
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
                <th>Documents</th>
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
                    <td>
                      <button 
                        className="table-btn-edit"
                        onClick={() => openDocModal(vehicle)}
                        style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-color)', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        📁 {vehicle.documents?.length || 0} Files
                      </button>
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

      {/* Vehicle Document Management Modal */}
      {showDocModal && activeVehicle && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3>📄 Document Vault: {activeVehicle.registrationNumber}</h3>
                <p className="panel-subtitle" style={{ fontSize: '0.85rem' }}>
                  Manage certificates, permits, and registration files for <strong>{activeVehicle.name}</strong>
                </p>
              </div>
              <button 
                type="button" 
                className="fp-back-btn" 
                onClick={() => setShowDocModal(false)}
                style={{ fontSize: '1.25rem', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            <div className="dispatcher-split-layout" style={{ gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Left Side: Upload Form */}
              <div className="dispatcher-form-panel flex-1" style={{ padding: '1.25rem' }}>
                <h4>Upload Document</h4>
                <p className="panel-subtitle" style={{ marginBottom: '1rem' }}>Attach a scanned permit or PDF file</p>
                <form onSubmit={handleUploadDoc} className="dispatcher-form">
                  <div className="form-group">
                    <label>Document Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Q3 Cargo Permit"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                      <option value="Insurance">Insurance Policy</option>
                      <option value="Registration">Vehicle Registration</option>
                      <option value="Inspection">Safety Inspection Certificate</option>
                      <option value="Permit">Transit Permit</option>
                      <option value="Other">Other Document</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Choose File *</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setDocFile(e.target.files[0])}
                      style={{ border: '1px dashed var(--border-color)', padding: '0.5rem' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="accent-action-btn w-full"
                    disabled={uploading || !docFile}
                  >
                    {uploading ? 'Uploading File...' : '📤 Upload Document'}
                  </button>
                </form>
              </div>

              {/* Right Side: Current Files List */}
              <div className="dispatcher-list-panel flex-2" style={{ padding: '1.25rem', minHeight: '300px' }}>
                <h4>Current Files Ledger</h4>
                <p className="panel-subtitle" style={{ marginBottom: '1rem' }}>Scanned documents stored in vault</p>

                {!activeVehicle.documents || activeVehicle.documents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
                    No documents uploaded for this asset yet.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="flat-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Document Name</th>
                          <th>Category</th>
                          <th>Uploaded</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeVehicle.documents.map((doc) => (
                          <tr key={doc._id}>
                            <td className="font-bold">{doc.name}</td>
                            <td>
                              <span className="status-badge" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)', border: '1px solid rgba(197, 168, 128, 0.15)' }}>
                                {doc.category}
                              </span>
                            </td>
                            <td>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="table-actions" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                                <a 
                                  href={`http://localhost:5000${doc.filePath}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="table-btn-edit"
                                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  Download
                                </a>
                                <button
                                  type="button"
                                  className="table-btn-delete"
                                  onClick={() => handleDeleteDoc(doc._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;
