import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Trips({ token, userRole, user, hasPermission }) {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Trip Dispatcher Form
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('5000');
  const [revenue, setRevenue] = useState('');

  // Complete Trip Dialog Control
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeTripId, setCompleteTripId] = useState('');
  const [finalOdom, setFinalOdom] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [completeError, setCompleteError] = useState('');
  const [completeVehicleOdom, setCompleteVehicleOdom] = useState(0);

  const fetchTripsAndAssets = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      // Parallel fetches
      const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
        fetch(`${API_URL}/trips`, { headers }),
        fetch(`${API_URL}/vehicles`, { headers }),
        fetch(`${API_URL}/drivers`, { headers })
      ]);

      if (!tripsRes.ok || !vehiclesRes.ok || !driversRes.ok) {
        throw new Error('Failed to load dispatch and asset data.');
      }

      const tripsData = await tripsRes.json();
      const vehiclesData = await vehiclesRes.json();
      const driversData = await driversRes.json();

      setTrips(tripsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndAssets();
  }, []);

  // Filter pools based on business rules for DISPATCH ORDER drop-downs
  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  
  const availableDrivers = drivers.filter(d => {
    const isLicenseValid = d.licenseExpiry && new Date(d.licenseExpiry) > new Date();
    const isAvailable = d.status === 'Available' && isLicenseValid;
    if (userRole === 'Driver') {
      return isAvailable && d.name === user?.name;
    }
    return isAvailable;
  });

  // Capacity validation calculations
  const selectedVehicleObj = vehicles.find(v => v._id === selectedVehicleId);
  const isOverloaded = selectedVehicleObj && cargoWeight && Number(cargoWeight) > selectedVehicleObj.maxCapacity;
  const overloadDifference = selectedVehicleObj && cargoWeight ? Number(cargoWeight) - selectedVehicleObj.maxCapacity : 0;
  const isDistanceExceeded = maxDistance && plannedDistance && Number(plannedDistance) > Number(maxDistance);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !plannedDistance) {
      alert('Please fill in all dispatch fields.');
      return;
    }

    if (isOverloaded) {
      alert('Cannot create dispatch: cargo exceeds vehicle load capacity.');
      return;
    }

    if (isDistanceExceeded) {
      alert(`Cannot create dispatch: planned distance (${plannedDistance} km) exceeds the maximum route limit of ${maxDistance} km.`);
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const payload = {
        source,
        destination,
        vehicleId: selectedVehicleId,
        driverId: selectedDriverId,
        cargoWeight: Number(cargoWeight),
        plannedDistance: Number(plannedDistance),
        revenue: revenue ? Number(revenue) : 0
      };

      const response = await fetch(`${API_URL}/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create trip.');
      }

      // Reset form
      setSource('');
      setDestination('');
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setCargoWeight('');
      setPlannedDistance('');
      setRevenue('');

      fetchTripsAndAssets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDispatch = async (tripId) => {
    try {
      const response = await fetch(`${API_URL}/trips/${tripId}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch trip.');
      }
      fetchTripsAndAssets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this trip dispatch?')) return;
    try {
      const response = await fetch(`${API_URL}/trips/${tripId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel trip.');
      }
      fetchTripsAndAssets();
    } catch (err) {
      alert(err.message);
    }
  };

  const openCompleteModal = (trip) => {
    setCompleteTripId(trip._id);
    setCompleteVehicleOdom(trip.vehicle?.odometer || 0);
    setFinalOdom('');
    setFuelConsumed('');
    setCompleteError('');
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!finalOdom || !fuelConsumed) {
      setCompleteError('Please provide final odometer and fuel readings.');
      return;
    }

    if (Number(finalOdom) < completeVehicleOdom) {
      setCompleteError(`Final odometer cannot be lower than the vehicle's initial reading (${completeVehicleOdom} km).`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/trips/${completeTripId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          finalOdometer: Number(finalOdom),
          fuelConsumed: Number(fuelConsumed)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete trip.');
      }

      setShowCompleteModal(false);
      fetchTripsAndAssets();
    } catch (err) {
      setCompleteError(err.message);
    }
  };

  const isAuthorized = hasPermission ? hasPermission(userRole, 'Create/Draft Dispatches') : (userRole === 'Fleet Manager' || userRole === 'Driver');

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>Trip Dispatcher Console</h2>
          <p className="subtitle">Plan dispatches, validate vehicle cargo weights, and track active en-route trips</p>
        </div>
      </div>

      {!isAuthorized && (
        <div className="info-banner warning-banner">
          ⚠️ Dispatch Control: You are logged in as a <strong>{userRole}</strong>. 
          Only <strong>authorized profiles</strong> with 'Create/Draft Dispatches' permission can draft dispatch orders.
        </div>
      )}

      {error && <div className="error-alert">{error}</div>}

      <div className="dispatcher-split-layout">
        {/* Left Side: Create Dispatch Order form */}
        <div className="dispatcher-form-panel">
          <h3>Create Dispatch Order</h3>
          <p className="panel-subtitle">Draft a new dispatch order for available drivers and fleet assets</p>
          
          <form onSubmit={handleCreateTrip} className="dispatcher-form">
            <div className="form-group">
              <label>Source Location *</label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="e.g. Warehouse North"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Destination Location *</label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="e.g. Retail Outlet Hub"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Select Available Vehicle *</label>
                <select 
                  required 
                  disabled={!isAuthorized}
                  value={selectedVehicleId} 
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  <option value="">-- Choose Vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.registrationNumber} - {v.name} ({v.type}, Max: {v.maxCapacity}kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Select Available Driver *</label>
                <select 
                  required 
                  disabled={!isAuthorized}
                  value={selectedDriverId} 
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Choose Driver --</option>
                  {availableDrivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} (Safety Score: {d.safetyScore})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Cargo Weight (kg) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  disabled={!isAuthorized}
                  placeholder="e.g. 450"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                />
              </div>

              <div className="form-group flex-1">
                <label>Planned Distance (km) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={maxDistance || undefined}
                  disabled={!isAuthorized}
                  placeholder="e.g. 120"
                  value={plannedDistance}
                  onChange={(e) => setPlannedDistance(e.target.value)}
                />
              </div>

              <div className="form-group flex-1">
                <label>Max Route Distance Limit (km)</label>
                <input
                  type="number"
                  min="1"
                  disabled={!isAuthorized}
                  placeholder="e.g. 5000"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  title="Set the maximum allowed planned distance for this dispatch"
                />
              </div>

              <div className="form-group flex-1">
                <label>Revenue ($)</label>
                <input
                  type="number"
                  min="0"
                  disabled={!isAuthorized}
                  placeholder="e.g. 600"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </div>
            </div>

            {/* Distance Exceeded Warning */}
            {isDistanceExceeded && (
              <div className="overload-warning-box">
                🚫 Distance Limit Exceeded: Planned route ({plannedDistance} km) exceeds the set limit of <strong>{maxDistance} km</strong>. 
                Please reduce the distance or increase the route limit.
              </div>
            )}

            {/* Overload Alert Warning */}
            {isOverloaded && (
              <div className="overload-warning-box">
                ⚠️ Overload Warning: Cargo weight exceeds vehicle load capacity limit by <strong>{overloadDifference} kg</strong>! 
                Please reduce cargo weight or select a larger vehicle.
              </div>
            )}

            <button 
              type="submit" 
              className="accent-action-btn w-full" 
              disabled={!isAuthorized || isOverloaded || isDistanceExceeded || !selectedVehicleId || !selectedDriverId}
            >
              Draft Dispatch Order
            </button>
          </form>
        </div>

        {/* Right Side: Active Dispatches Console */}
        <div className="dispatcher-list-panel">
          <h3>Active Dispatches</h3>
          <p className="panel-subtitle">Monitor dispatcher progress queues and active trip updates</p>

          {loading && trips.length === 0 ? (
            <div className="loading-state">Loading trip history...</div>
          ) : trips.length === 0 ? (
            <div className="empty-state">No dispatches recorded.</div>
          ) : (
            <div className="dispatches-queue">
              {trips.map((trip) => {
                const isDraft = trip.status === 'Draft';
                const isDispatched = trip.status === 'Dispatched';
                const isCompleted = trip.status === 'Completed';
                const isCancelled = trip.status === 'Cancelled';

                let stepPercent = '0%';
                if (isDispatched) stepPercent = '50%';
                if (isCompleted || isCancelled) stepPercent = '100%';

                let progressClass = '';
                if (isCancelled) progressClass = 'cancelled';
                if (isCompleted) progressClass = 'completed';

                return (
                  <div key={trip._id} className={`trip-dispatch-card ${trip.status.toLowerCase()}`}>
                    <div className="trip-card-header">
                      <span className="trip-card-id numeric">Trip #{trip._id.substring(18)}</span>
                      <span className={`status-badge ${trip.status.toLowerCase()}`}>{trip.status}</span>
                    </div>

                    <div className="trip-card-details">
                      <div>
                        <strong>Route:</strong> {trip.source} ➔ {trip.destination}
                      </div>
                      <div className="trip-card-subdetails">
                        <span><strong>Vehicle:</strong> {trip.vehicle?.registrationNumber || 'N/A'}</span>
                        <span><strong>Driver:</strong> {trip.driver?.name || 'N/A'}</span>
                      </div>
                      <div className="trip-card-subdetails">
                        <span><strong>Cargo:</strong> {trip.cargoWeight} kg</span>
                        <span><strong>Distance:</strong> {trip.plannedDistance} km</span>
                        {trip.revenue > 0 && <span><strong>Rev:</strong> ${trip.revenue}</span>}
                      </div>
                    </div>

                    {/* Progress Lifecycle Bar */}
                    <div className="trip-lifecycle">
                      <div className="lifecycle-track">
                        <div className={`lifecycle-fill ${progressClass}`} style={{ width: stepPercent }}></div>
                      </div>
                      <div className="lifecycle-nodes">
                        <span className="node active">Draft</span>
                        <span className={`node ${isDispatched || isCompleted || isCancelled ? 'active' : ''}`}>Dispatched</span>
                        <span className={`node ${isCompleted ? 'active' : isCancelled ? 'cancelled' : ''}`}>
                          {isCancelled ? 'Cancelled' : 'Completed'}
                        </span>
                      </div>
                    </div>

                    {/* Actions panel */}
                    {((isDraft && (hasPermission ? hasPermission(userRole, 'Dispatch Active Trips') : isAuthorized)) ||
                      (isDispatched && (hasPermission ? hasPermission(userRole, 'Complete/Cancel Trips') : isAuthorized))) && (
                      <div className="trip-card-actions">
                        {isDraft && (
                          <button 
                            className="btn-dispatch"
                            onClick={() => handleDispatch(trip._id)}
                          >
                            Dispatch Trip
                          </button>
                        )}
                        {isDispatched && (
                          <>
                            <button 
                              className="btn-complete"
                              onClick={() => openCompleteModal(trip)}
                            >
                              Complete
                            </button>
                            <button 
                              className="btn-cancel"
                              onClick={() => handleCancel(trip._id)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Complete Trip Dialog Modal */}
      {showCompleteModal && (
        <div className="modal-backdrop">
          <div className="modal-card mini">
            <h3>Complete Trip Dispatch</h3>
            <p className="modal-subtitle">Log the final odometer readings and total fuel consumed during this route.</p>
            
            {completeError && <div className="error-alert">{completeError}</div>}
            
            <form onSubmit={handleCompleteSubmit} className="modal-form">
              <div className="form-group">
                <label>Final Odometer reading (km) *</label>
                <input
                  type="number"
                  required
                  placeholder={`Must be >= ${completeVehicleOdom} km`}
                  value={finalOdom}
                  onChange={(e) => setFinalOdom(e.target.value)}
                />
                <span className="form-tip">Initial vehicle odometer was {completeVehicleOdom} km</span>
              </div>

              <div className="form-group">
                <label>Fuel Consumed (Liters) *</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 15.5"
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowCompleteModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Complete Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trips;
