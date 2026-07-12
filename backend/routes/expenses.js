import express from 'express';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
import { protect, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all fuel logs
// @route   GET /api/expenses/fuel
// @access  Private (Financial Analyst / Fleet Manager only)
router.get('/fuel', protect, checkPermission('Log Fuel refills & Expenses'), async (req, res) => {
  try {
    const logs = await FuelLog.find({}).populate('vehicle').sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Log fuel purchase
// @route   POST /api/expenses/fuel
// @access  Private (Financial Analyst / Fleet Manager only)
router.post('/fuel', protect, checkPermission('Log Fuel refills & Expenses'), async (req, res) => {
  const { vehicleId, liters, cost, date } = req.body;

  if (!vehicleId || !liters || !cost) {
    return res.status(400).json({ error: 'Please enter vehicle, liters, and cost' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const log = await FuelLog.create({
      vehicle: vehicleId,
      liters,
      cost,
      date: date ? new Date(date) : new Date()
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Get all other expenses
// @route   GET /api/expenses/misc
// @access  Private (Financial Analyst / Fleet Manager only)
router.get('/misc', protect, checkPermission('Log Fuel refills & Expenses'), async (req, res) => {
  try {
    const logs = await Expense.find({}).populate('vehicle').sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Log miscellaneous expense (tolls, insurance, etc.)
// @route   POST /api/expenses/misc
// @access  Private (Financial Analyst / Fleet Manager only)
router.post('/misc', protect, checkPermission('Log Fuel refills & Expenses'), async (req, res) => {
  const { vehicleId, type, amount, description, date } = req.body;

  if (!vehicleId || !type || !amount) {
    return res.status(400).json({ error: 'Please enter vehicle, type, and amount' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const log = await Expense.create({
      vehicle: vehicleId,
      type,
      amount,
      description,
      date: date ? new Date(date) : new Date()
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Get total operational cost (Fuel + Maintenance + Misc) per vehicle
// @route   GET /api/expenses/cost/:vehicleId
// @access  Private (Financial Analyst / Fleet Manager only)
router.get('/cost/:vehicleId', protect, checkPermission('Log Fuel refills & Expenses'), async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // 1. Calculate Fuel Cost
    const fuelLogs = await FuelLog.find({ vehicle: vehicleId });
    const totalFuelCost = fuelLogs.reduce((acc, log) => acc + log.cost, 0);

    // 2. Calculate Maintenance Cost
    const maintenanceLogs = await Maintenance.find({ vehicle: vehicleId });
    const totalMaintenanceCost = maintenanceLogs.reduce((acc, log) => acc + log.cost, 0);

    // 3. Calculate Misc Expense Cost
    const miscExpenses = await Expense.find({ vehicle: vehicleId });
    const totalMiscCost = miscExpenses.reduce((acc, log) => acc + log.amount, 0);

    const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalMiscCost;

    res.json({
      vehicleId,
      registrationNumber: vehicle.registrationNumber,
      fuelCost: totalFuelCost,
      maintenanceCost: totalMaintenanceCost,
      miscCost: totalMiscCost,
      totalOperationalCost
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
