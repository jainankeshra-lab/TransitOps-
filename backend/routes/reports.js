import express from 'express';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Trip from '../models/Trip.js';
import Maintenance from '../models/Maintenance.js';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import { protect, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get Dashboard metrics & KPIs (with filters)
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', protect, checkPermission('View Dashboard KPIs'), async (req, res) => {
  const { type, status, region } = req.query;

  try {
    let totalVehicles, activeVehicles, availableVehicles, inMaintenanceVehicles, retiredVehicles;
    let activeTrips, pendingTrips, completedTrips, driversOnDuty, fleetUtilization;

    if (req.user.role === 'Driver') {
      const driverProfile = await Driver.findOne({ name: req.user.name });
      if (driverProfile) {
        const driverTrips = await Trip.find({ driver: driverProfile._id });
        activeTrips = driverTrips.filter(t => t.status === 'Dispatched').length;
        pendingTrips = driverTrips.filter(t => t.status === 'Draft').length;
        completedTrips = driverTrips.filter(t => t.status === 'Completed').length;
        
        driversOnDuty = (driverProfile.status === 'Available' || driverProfile.status === 'On Trip') ? 1 : 0;
        
        const isDriving = driverProfile.status === 'On Trip';
        activeVehicles = isDriving ? 1 : 0;
        availableVehicles = driverProfile.status === 'Available' ? 1 : 0;
        inMaintenanceVehicles = driverProfile.status === 'In Shop' ? 1 : 0;
        retiredVehicles = 0;
        totalVehicles = 1;
        fleetUtilization = isDriving ? 100 : 0;
      } else {
        totalVehicles = 0; activeVehicles = 0; availableVehicles = 0; inMaintenanceVehicles = 0; retiredVehicles = 0;
        activeTrips = 0; pendingTrips = 0; completedTrips = 0; driversOnDuty = 0; fleetUtilization = 0;
      }
    } else {
      // Construct vehicle filters
      const vehicleFilter = {};
      if (type) vehicleFilter.type = type;
      if (status) vehicleFilter.status = status;
      if (region) vehicleFilter.region = region;

      // Fetch vehicles
      const vehicles = await Vehicle.find(vehicleFilter);
      totalVehicles = vehicles.length;

      // KPI Counts
      activeVehicles = vehicles.filter(v => v.status === 'On Trip').length;
      availableVehicles = vehicles.filter(v => v.status === 'Available').length;
      inMaintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
      retiredVehicles = vehicles.filter(v => v.status === 'Retired').length;

      fleetUtilization = totalVehicles > 0 
        ? Math.round((activeVehicles / totalVehicles) * 100) 
        : 0;

      // Driver metrics (we can filter by region if driver profiles had regions, otherwise global)
      const drivers = await Driver.find({});
      driversOnDuty = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length;

      // Trips counts
      // Map vehicle ids for filter matching
      const vehicleIds = vehicles.map(v => v._id);
      const trips = await Trip.find({ vehicle: { $in: vehicleIds } });
      
      activeTrips = trips.filter(t => t.status === 'Dispatched').length;
      pendingTrips = trips.filter(t => t.status === 'Draft').length;
      completedTrips = trips.filter(t => t.status === 'Completed').length;
    }

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
router.get('/analytics', protect, checkPermission('View Financial Yields & ROI Reports'), async (req, res) => {
  try {
    let vehiclesFilter = {};
    if (req.user.role === 'Driver') {
      const driverProfile = await Driver.findOne({ name: req.user.name });
      if (driverProfile) {
        const driverTrips = await Trip.find({ driver: driverProfile._id });
        const vehicleIds = driverTrips.map(t => t.vehicle);
        vehiclesFilter = { _id: { $in: vehicleIds } };
      } else {
        return res.json([]);
      }
    }

    const vehicles = await Vehicle.find(vehiclesFilter);
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
router.get('/export-csv', protect, checkPermission('Export Report Spreadsheets (CSV)'), async (req, res) => {
  try {
    let vehiclesFilter = {};
    if (req.user.role === 'Driver') {
      const driverProfile = await Driver.findOne({ name: req.user.name });
      if (driverProfile) {
        const driverTrips = await Trip.find({ driver: driverProfile._id });
        const vehicleIds = driverTrips.map(t => t.vehicle);
        vehiclesFilter = { _id: { $in: vehicleIds } };
      } else {
        return res.status(200).send('No data available\n');
      }
    }
    const vehicles = await Vehicle.find(vehiclesFilter);
    
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
