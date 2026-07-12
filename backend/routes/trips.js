import express from 'express';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import FuelLog from '../models/FuelLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all trips
// @route   GET /api/trips
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const trips = await Trip.find({})
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Get single trip
// @route   GET /api/trips/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicle')
      .populate('driver');
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private (Driver or Fleet Manager)
router.post('/', protect, authorize('Fleet Manager', 'Driver'), async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue } = req.body;

  if (!source || !destination || !vehicleId || !driverId || !cargoWeight || !plannedDistance) {
    return res.status(400).json({ error: 'Please enter all required fields' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // 1. Cargo weight validation
    if (cargoWeight > vehicle.maxCapacity) {
      return res.status(400).json({ 
        error: `Cargo weight (${cargoWeight} kg) exceeds vehicle's maximum load capacity (${vehicle.maxCapacity} kg).` 
      });
    }

    // 2. Vehicle status validation (Draft can select, but Retired or In Shop are excluded)
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      return res.status(400).json({ 
        error: `Vehicle is currently ${vehicle.status} and cannot be assigned to any trip.` 
      });
    }

    // 3. Driver status validation (Suspended drivers are excluded)
    if (driver.status === 'Suspended') {
      return res.status(400).json({ error: 'Driver is currently suspended and cannot be assigned to any trip.' });
    }

    // 4. Driver license expiry check
    if (new Date(driver.licenseExpiry) < new Date()) {
      return res.status(400).json({ error: 'Driver has an expired license and cannot be assigned to any trip.' });
    }

    const trip = await Trip.create({
      source,
      destination,
      vehicle: vehicleId,
      driver: driverId,
      cargoWeight,
      plannedDistance,
      revenue: revenue || 0,
      status: 'Draft'
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Dispatch a trip
// @route   POST /api/trips/:id/dispatch
// @access  Private (Driver or Fleet Manager)
router.post('/:id/dispatch', protect, authorize('Fleet Manager', 'Driver'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.status !== 'Draft') {
      return res.status(400).json({ error: `Trip is already in ${trip.status} state.` });
    }

    const vehicle = await Vehicle.findById(trip.vehicle);
    const driver = await Driver.findById(trip.driver);

    // Business validations at the exact moment of Dispatch
    if (vehicle.status !== 'Available') {
      return res.status(400).json({ error: `Vehicle is not Available. Current status: ${vehicle.status}.` });
    }

    if (driver.status !== 'Available') {
      return res.status(400).json({ error: `Driver is not Available. Current status: ${driver.status}.` });
    }

    if (new Date(driver.licenseExpiry) < new Date()) {
      return res.status(400).json({ error: 'Driver license is expired. Cannot dispatch.' });
    }

    if (trip.cargoWeight > vehicle.maxCapacity) {
      return res.status(400).json({ error: 'Cargo weight exceeds vehicle capacity. Cannot dispatch.' });
    }

    // Process status updates
    trip.status = 'Dispatched';
    await trip.save();

    vehicle.status = 'On Trip';
    await vehicle.save();

    driver.status = 'On Trip';
    await driver.save();

    res.json({ message: 'Trip successfully dispatched.', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Complete a trip
// @route   POST /api/trips/:id/complete
// @access  Private (Driver or Fleet Manager)
router.post('/:id/complete', protect, authorize('Fleet Manager', 'Driver'), async (req, res) => {
  const { finalOdometer, fuelConsumed } = req.body;

  if (finalOdometer === undefined || fuelConsumed === undefined) {
    return res.status(400).json({ error: 'Please provide final odometer and fuel consumed.' });
  }

  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ error: `Only Dispatched trips can be completed. Current state: ${trip.status}` });
    }

    const vehicle = await Vehicle.findById(trip.vehicle);
    const driver = await Driver.findById(trip.driver);

    if (finalOdometer < vehicle.odometer) {
      return res.status(400).json({ 
        error: `Final odometer (${finalOdometer} km) cannot be lower than the vehicle's current odometer (${vehicle.odometer} km).` 
      });
    }

    // Process Trip Completion
    trip.status = 'Completed';
    trip.finalOdometer = finalOdometer;
    trip.fuelConsumed = fuelConsumed;
    await trip.save();

    // Reset vehicle & driver back to Available
    vehicle.status = 'Available';
    vehicle.odometer = finalOdometer;
    await vehicle.save();

    driver.status = 'Available';
    await driver.save();

    // Log the fuel logs in the system database
    if (fuelConsumed > 0) {
      // Simulate cost ($1.50 per liter for simplicity, or can be passed)
      const costPerLiter = 1.50; 
      await FuelLog.create({
        vehicle: vehicle._id,
        liters: fuelConsumed,
        cost: Math.round(fuelConsumed * costPerLiter * 100) / 100,
        date: new Date()
      });
    }

    res.json({ message: 'Trip successfully completed.', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Cancel a dispatched trip
// @route   POST /api/trips/:id/cancel
// @access  Private (Driver or Fleet Manager)
router.post('/:id/cancel', protect, authorize('Fleet Manager', 'Driver'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Trip can be cancelled from Draft or Dispatched
    if (trip.status !== 'Draft' && trip.status !== 'Dispatched') {
      return res.status(400).json({ error: `Cannot cancel a trip that is already ${trip.status}.` });
    }

    const vehicle = await Vehicle.findById(trip.vehicle);
    const driver = await Driver.findById(trip.driver);

    // If it was already dispatched, we release the vehicle and driver
    if (trip.status === 'Dispatched') {
      if (vehicle && vehicle.status === 'On Trip') {
        vehicle.status = 'Available';
        await vehicle.save();
      }
      if (driver && driver.status === 'On Trip') {
        driver.status = 'Available';
        await driver.save();
      }
    }

    trip.status = 'Cancelled';
    await trip.save();

    res.json({ message: 'Trip successfully cancelled.', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
