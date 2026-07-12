import express from 'express';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Trip from '../models/Trip.js';
import Maintenance from '../models/Maintenance.js';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get Dashboard metrics & KPIs (with filters)
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  const { type, status, region } = req.query;

  try {
    // Construct vehicle filters
    const vehicleFilter = {};
    if (type) vehicleFilter.type = type;
    if (status) vehicleFilter.status = status;
    if (region) vehicleFilter.region = region;

    // Fetch vehicles
    const vehicles = await Vehicle.find(vehicleFilter);
    const totalVehicles = vehicles.length;

    // KPI Counts
    const activeVehicles = vehicles.filter(v => v.status === 'On Trip').length;
    const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
    const inMaintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
    const retiredVehicles = vehicles.filter(v => v.status === 'Retired').length;

    const fleetUtilization = totalVehicles > 0 
      ? Math.round((activeVehicles / totalVehicles) * 100) 
      : 0;

    // Driver metrics (we can filter by region if driver profiles had regions, otherwise global)
    const drivers = await Driver.find({});
    const driversOnDuty = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length;

    // Trips counts
    // Map vehicle ids for filter matching
    const vehicleIds = vehicles.map(v => v._id);
    const trips = await Trip.find({ vehicle: { $in: vehicleIds } });
    
    const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
    const pendingTrips = trips.filter(t => t.status === 'Draft').length;
    const completedTrips = trips.filter(t => t.status === 'Completed').length;

    res.json({
      kpis: {
        totalVehicles,
        activeVehicles,
        availableVehicles,
        inMaintenanceVehicles,
        retiredVehicles,
        activeTrips,
        pendingTrips,
        completedTrips,
        driversOnDuty,
        fleetUtilization
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Get Detailed Fleet Analytics and ROI
// @route   GET /api/reports/analytics
// @access  Private
router.get('/analytics', protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({});
    const reportData = [];

    for (const vehicle of vehicles) {
      // 1. Calculate Fuel Cost and Liters
      const fuelLogs = await FuelLog.find({ vehicle: vehicle._id });
      const totalFuelCost = fuelLogs.reduce((acc, l) => acc + l.cost, 0);
      const totalFuelLiters = fuelLogs.reduce((acc, l) => acc + l.liters, 0);

      // 2. Calculate Maintenance Cost
      const maintenanceLogs = await Maintenance.find({ vehicle: vehicle._id });
      const totalMaintenanceCost = maintenanceLogs.reduce((acc, m) => acc + m.cost, 0);

      // 3. Calculate Other Expenses
      const otherExpenses = await Expense.find({ vehicle: vehicle._id });
      const totalOtherCost = otherExpenses.reduce((acc, e) => acc + e.amount, 0);

      // 4. Calculate Distance and Revenue from Trips
      const trips = await Trip.find({ vehicle: vehicle._id, status: 'Completed' });
      const totalDistance = trips.reduce((acc, t) => acc + t.plannedDistance, 0);
      const totalRevenue = trips.reduce((acc, t) => acc + t.revenue, 0);

      // Calculate Fuel Efficiency (Distance / Fuel liters)
      const fuelEfficiency = totalFuelLiters > 0 
        ? Math.round((totalDistance / totalFuelLiters) * 100) / 100 
        : 0;

      // Calculate ROI: (Revenue - (Maintenance + Fuel)) / Acquisition Cost
      // We will also subtract other expenses to be precise, or stick strictly to formula:
      // (Revenue - (Maintenance + Fuel)) / AcquisitionCost
      const totalOperationalExpenses = totalMaintenanceCost + totalFuelCost;
      const vehicleROI = vehicle.acquisitionCost > 0
        ? Math.round(((totalRevenue - totalOperationalExpenses) / vehicle.acquisitionCost) * 10000) / 100
        : 0;

      reportData.push({
        _id: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        name: vehicle.name,
        type: vehicle.type,
        acquisitionCost: vehicle.acquisitionCost,
        totalDistance,
        totalRevenue,
        fuelCost: totalFuelCost,
        fuelLiters: totalFuelLiters,
        fuelEfficiency,
        maintenanceCost: totalMaintenanceCost,
        otherCost: totalOtherCost,
        totalCost: totalFuelCost + totalMaintenanceCost + totalOtherCost,
        roi: vehicleROI
      });
    }

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Export Fleet Analytics as CSV
// @route   GET /api/reports/export-csv
// @access  Private
router.get('/export-csv', protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({});
    
    // Headers
    let csv = 'Reg Number,Vehicle Name,Type,Acquisition Cost ($),Total Distance (km),Total Revenue ($),Fuel Cost ($),Fuel Liters (L),Efficiency (km/L),Maintenance ($),Other Expenses ($),Total Costs ($),ROI (%)\n';

    for (const vehicle of vehicles) {
      const fuelLogs = await FuelLog.find({ vehicle: vehicle._id });
      const totalFuelCost = fuelLogs.reduce((acc, l) => acc + l.cost, 0);
      const totalFuelLiters = fuelLogs.reduce((acc, l) => acc + l.liters, 0);

      const maintenanceLogs = await Maintenance.find({ vehicle: vehicle._id });
      const totalMaintenanceCost = maintenanceLogs.reduce((acc, m) => acc + m.cost, 0);

      const otherExpenses = await Expense.find({ vehicle: vehicle._id });
      const totalOtherCost = otherExpenses.reduce((acc, e) => acc + e.amount, 0);

      const trips = await Trip.find({ vehicle: vehicle._id, status: 'Completed' });
      const totalDistance = trips.reduce((acc, t) => acc + t.plannedDistance, 0);
      const totalRevenue = trips.reduce((acc, t) => acc + t.revenue, 0);

      const fuelEfficiency = totalFuelLiters > 0 
        ? Math.round((totalDistance / totalFuelLiters) * 100) / 100 
        : 0;

      const totalOperationalExpenses = totalMaintenanceCost + totalFuelCost;
      const vehicleROI = vehicle.acquisitionCost > 0
        ? Math.round(((totalRevenue - totalOperationalExpenses) / vehicle.acquisitionCost) * 10000) / 100
        : 0;

      const totalCost = totalFuelCost + totalMaintenanceCost + totalOtherCost;

      csv += `"${vehicle.registrationNumber}","${vehicle.name}","${vehicle.type}",${vehicle.acquisitionCost},${totalDistance},${totalRevenue},${totalFuelCost},${totalFuelLiters},${fuelEfficiency},${totalMaintenanceCost},${totalOtherCost},${totalCost},${vehicleROI}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.attachment('transitops-fleet-report.csv');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
