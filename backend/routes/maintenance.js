import express from 'express';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
import { protect, checkPermission } from '../middleware/auth.js';
import RBAC from '../models/RBAC.js';

const router = express.Router();

// Helper middleware to check if user has read access to Maintenance
const canReadMaintenance = async (req, res, next) => {
  if (req.user.role === 'Financial Analyst' || req.user.role === 'Fleet Manager') {
    return next();
  }
  
  try {
    const rbac = await RBAC.findOne({ key: 'current_matrix' });
    if (rbac) {
      const row = rbac.permissions.find(p => p.feature === 'Schedule Maintenance Logs');
      const role = req.user.role;
      const roleKey = 
        role === 'Fleet Manager' ? 'manager' :
        role === 'Driver' ? 'driver' :
        role === 'Safety Officer' ? 'safety' :
        role === 'Financial Analyst' ? 'analyst' : null;
        
      if (row && roleKey && row[roleKey]) {
        return next();
      }
    }
  } catch (err) {
    console.error(err);
  }
  
  res.status(403).json({ error: 'Access denied. You do not have permission to view maintenance logs.' });
};

// @desc    Get all maintenance records
// @route   GET /api/maintenance
// @access  Private (Fleet Manager or authorized roles)
router.get('/', protect, canReadMaintenance, async (req, res) => {
  try {
    const logs = await Maintenance.find({})
      .populate('vehicle')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Create a maintenance record (Send vehicle to shop)
// @route   POST /api/maintenance
// @access  Private (Fleet Manager only)
router.post('/', protect, checkPermission('Schedule Maintenance Logs'), async (req, res) => {
  const { vehicleId, description, cost, startDate } = req.body;

  if (!vehicleId || !description || cost === undefined) {
    return res.status(400).json({ error: 'Please enter vehicle, description and cost' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (vehicle.status === 'Retired') {
      return res.status(400).json({ error: 'Cannot send a retired vehicle to the maintenance shop.' });
    }

    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot send an active vehicle (On Trip) to maintenance. Complete or cancel the trip first.' });
    }

    // Create Maintenance Log
    const log = await Maintenance.create({
      vehicle: vehicleId,
      description,
      cost,
      startDate: startDate ? new Date(startDate) : new Date(),
      status: 'Open'
    });

    // Update vehicle status to 'In Shop'
    vehicle.status = 'In Shop';
    await vehicle.save();

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Close maintenance record (Release vehicle from shop)
// @route   POST /api/maintenance/:id/close
// @access  Private (Fleet Manager only)
router.post('/:id/close', protect, checkPermission('Close Maintenance Tickets'), async (req, res) => {
  try {
    const log = await Maintenance.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }

    if (log.status === 'Closed') {
      return res.status(400).json({ error: 'This maintenance record is already closed.' });
    }

    const vehicle = await Vehicle.findById(log.vehicle);
    if (vehicle) {
      // Release from In Shop to Available (unless retired in the meantime)
      if (vehicle.status === 'In Shop') {
        vehicle.status = 'Available';
        await vehicle.save();
      }
    }

    log.status = 'Closed';
    log.endDate = new Date();
    await log.save();

    res.json({ message: 'Maintenance record closed and vehicle released.', log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
