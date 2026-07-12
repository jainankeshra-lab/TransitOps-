import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Expenses({ token, userRole }) {
  const [vehicles, setVehicles] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [miscExpenses, setMiscExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fuel Refill Form
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState('');

  // Misc Expense Form
  const [miscVehicleId, setMiscVehicleId] = useState('');
  const [miscType, setMiscType] = useState('Tolls');
  const [miscAmount, setMiscAmount] = useState('');
  const [miscDesc, setMiscDesc] = useState('');
  const [miscDate, setMiscDate] = useState('');

  // Selected Vehicle for Cost Summary
  const [selectedVehicleCostId, setSelectedVehicleCostId] = useState('');
  const [vehicleCostSummary, setVehicleCostSummary] = useState(null);

  const fetchExpensesAndVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      const [vehiclesRes, fuelRes, miscRes] = await Promise.all([
        fetch(`${API_URL}/vehicles`, { headers }),
        fetch(`${API_URL}/expenses/fuel`, { headers }),
        fetch(`${API_URL}/expenses/misc`, { headers })
      ]);

      if (!vehiclesRes.ok || !fuelRes.ok || !miscRes.ok) {
        throw new Error('Failed to load expense records.');
      }

      const vehiclesData = await vehiclesRes.json();
      const fuelData = await fuelRes.json();
      const miscData = await miscRes.json();

      setVehicles(vehiclesData);
      setFuelLogs(fuelData);
      setMiscExpenses(miscData);

      // Auto select first vehicle for costs if none selected
      if (vehiclesData.length > 0 && !selectedVehicleCostId) {
        setSelectedVehicleCostId(vehiclesData[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleCostSummary = async (vehicleId) => {
    if (!vehicleId) return;
    try {
      const response = await fetch(`${API_URL}/expenses/cost/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load vehicle cost calculations.');
      const data = await response.json();
      setVehicleCostSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpensesAndVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleCostId) {
      fetchVehicleCostSummary(selectedVehicleCostId);
    }
  }, [selectedVehicleCostId, fuelLogs, miscExpenses]);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    if (!fuelVehicleId || !fuelLiters || !fuelCost) {
      alert('Please fill in vehicle, liters, and refueling cost.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/expenses/fuel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: fuelVehicleId,
          liters: Number(fuelLiters),
          cost: Number(fuelCost),
          date: fuelDate || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to log fuel refill.');

      setFuelVehicleId('');
      setFuelLiters('');
      setFuelCost('');
      setFuelDate('');
      fetchExpensesAndVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMiscSubmit = async (e) => {
    e.preventDefault();
    if (!miscVehicleId || !miscType || !miscAmount) {
      alert('Please fill in vehicle, type, and expense amount.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/expenses/misc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: miscVehicleId,
          type: miscType,
          amount: Number(miscAmount),
          description: miscDesc,
          date: miscDate || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to log expense.');

      setMiscVehicleId('');
      setMiscAmount('');
      setMiscDesc('');
      setMiscDate('');
      fetchExpensesAndVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalFuelSum = fuelLogs.reduce((acc, l) => acc + l.cost, 0);
  const totalMiscSum = miscExpenses.reduce((acc, l) => acc + l.amount, 0);

  const isAuthorized = userRole === 'Fleet Manager' || userRole === 'Financial Analyst';

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>Fuel & Expense Management</h2>
          <p className="subtitle">Log fuel refills, track toll fees and insurance, and sum vehicle operating costs</p>
        </div>
      </div>

      {!isAuthorized && (
        <div className="info-banner warning-banner">
          ⚠️ Financial Ledger Note: You are logged in as a <strong>{userRole}</strong>. 
          Only <strong>Fleet Managers</strong> and <strong>Financial Analysts</strong> are authorized to log expense entries.
        </div>
      )}

      {error && <div className="error-alert">{error}</div>}

      {/* Forms Section */}
      <div className="dispatcher-split-layout">
        {/* Log Fuel Purchase */}
        <div className="dispatcher-form-panel">
          <h3>Log Fuel Refill</h3>
          <p className="panel-subtitle">Record liters refueled and cost amounts per vehicle</p>
          <form onSubmit={handleFuelSubmit} className="dispatcher-form">
            <div className="form-group">
              <label>Select Vehicle *</label>
              <select required disabled={!isAuthorized} value={fuelVehicleId} onChange={(e) => setFuelVehicleId(e.target.value)}>
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.registrationNumber} - {v.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Fuel Liters *</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  disabled={!isAuthorized}
                  placeholder="e.g. 45"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                />
              </div>
              <div className="form-group flex-1">
                <label>Total Cost ($) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  disabled={!isAuthorized}
                  placeholder="e.g. 70"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Refuel Date</label>
              <input type="date" disabled={!isAuthorized} value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} />
            </div>
            <button type="submit" className="accent-action-btn w-full" disabled={!isAuthorized || !fuelVehicleId}>
              Log Fuel Refill
            </button>
          </form>
        </div>

        {/* Log Miscellaneous Expense */}
        <div className="dispatcher-form-panel">
          <h3>Log Muted Expense</h3>
          <p className="panel-subtitle">Record operational costs like highway tolls and monthly insurance</p>
          <form onSubmit={handleMiscSubmit} className="dispatcher-form">
            <div className="form-group">
              <label>Select Vehicle *</label>
              <select required disabled={!isAuthorized} value={miscVehicleId} onChange={(e) => setMiscVehicleId(e.target.value)}>
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.registrationNumber} - {v.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Expense Type *</label>
                <select value={miscType} disabled={!isAuthorized} onChange={(e) => setMiscType(e.target.value)}>
                  <option value="Tolls">Tolls</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group flex-1">
                <label>Cost Amount ($) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  disabled={!isAuthorized}
                  placeholder="e.g. 35"
                  value={miscAmount}
                  onChange={(e) => setMiscAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description / Note</label>
              <input
                type="text"
                disabled={!isAuthorized}
                placeholder="e.g. Highway tolls"
                value={miscDesc}
                onChange={(e) => setMiscDesc(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Expense Date</label>
              <input type="date" disabled={!isAuthorized} value={miscDate} onChange={(e) => setMiscDate(e.target.value)} />
            </div>
            <button type="submit" className="accent-action-btn w-full" disabled={!isAuthorized || !miscVehicleId}>
              Log Muted Expense
            </button>
          </form>
        </div>
      </div>

      {/* Grid: Fuel Table, Expense Table, and Cost summary calculators */}
      <div className="dashboard-sections">
        {/* Fuel logs */}
        <div className="section-panel flex-1">
          <h3>Fuel Refills</h3>
          {fuelLogs.length === 0 ? (
            <div className="empty-state">No fuel entries logged.</div>
          ) : (
            <div className="table-responsive">
              <table className="flat-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Date</th>
                    <th className="numeric">Liters</th>
                    <th className="numeric">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelLogs.map((log) => (
                    <tr key={log._id}>
                      <td className="font-bold">{log.vehicle?.registrationNumber || 'N/A'}</td>
                      <td className="numeric">{log.date ? log.date.substring(0, 10) : 'N/A'}</td>
                      <td className="numeric">{log.liters} L</td>
                      <td className="numeric">${log.cost}</td>
                    </tr>
                  ))}
                  <tr className="table-totals">
                    <td colSpan="3">Total Refueling Costs</td>
                    <td className="numeric">${totalFuelSum.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Other expenses */}
        <div className="section-panel flex-1">
          <h3>Other Expenses</h3>
          {miscExpenses.length === 0 ? (
            <div className="empty-state">No other expenses logged.</div>
          ) : (
            <div className="table-responsive">
              <table className="flat-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="numeric">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {miscExpenses.map((log) => (
                    <tr key={log._id}>
                      <td className="font-bold">{log.vehicle?.registrationNumber || 'N/A'}</td>
                      <td className="numeric">{log.date ? log.date.substring(0, 10) : 'N/A'}</td>
                      <td>{log.type}</td>
                      <td>{log.description || '—'}</td>
                      <td className="numeric">${log.amount}</td>
                    </tr>
                  ))}
                  <tr className="table-totals">
                    <td colSpan="4">Total Muted Costs</td>
                    <td className="numeric">${totalMiscSum.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Cost Calculation summary card */}
        <div className="section-panel flex-1">
          <h3>Vehicle Cumulative Cost</h3>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Select Target Vehicle</label>
            <select value={selectedVehicleCostId} onChange={(e) => setSelectedVehicleCostId(e.target.value)}>
              <option value="">-- Select --</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>{v.registrationNumber} - {v.name}</option>
              ))}
            </select>
          </div>

          {vehicleCostSummary ? (
            <div className="cost-summary-list">
              <div className="cost-summary-item">
                <span>Refueling Total:</span>
                <span className="numeric font-bold">${vehicleCostSummary.fuelCost.toLocaleString()}</span>
              </div>
              <div className="cost-summary-item">
                <span>Maintenance Total:</span>
                <span className="numeric font-bold">${vehicleCostSummary.maintenanceCost.toLocaleString()}</span>
              </div>
              <div className="cost-summary-item">
                <span>Miscellaneous Total:</span>
                <span className="numeric font-bold">${vehicleCostSummary.miscCost.toLocaleString()}</span>
              </div>
              <div className="cost-summary-item grand-total">
                <span>Total Operating Cost:</span>
                <span className="numeric font-bold">${vehicleCostSummary.totalOperationalCost.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a vehicle to calculate costs.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Expenses;
