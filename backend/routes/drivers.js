import express from 'express';
import Driver from '../models/Driver.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Private
router.get('/', protect, async (req, res) => {
  const { status, search } = req.query;
  const query = {};

  if (status) query.status = status;
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  try {
    const drivers = await Driver.find(query);
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Get single driver
// @route   GET /api/drivers/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Create a driver
// @route   POST /api/drivers
// @access  Private (Fleet Manager / Safety Officer only)
router.post('/', protect, authorize('Fleet Manager', 'Safety Officer'), async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contact, safetyScore, status } = req.body;

  if (!name || !licenseNumber || !licenseCategory || !licenseExpiry || !contact) {
    return res.status(400).json({ error: 'Please enter all required fields' });
  }

  try {
    const driver = await Driver.create({
      name,
      licenseNumber,
      licenseCategory,
      licenseExpiry: new Date(licenseExpiry),
      contact,
      safetyScore: safetyScore !== undefined ? safetyScore : 100,
      status: status || 'Available'
    });

    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Update a driver
// @route   PUT /api/drivers/:id
// @access  Private (Fleet Manager / Safety Officer only)
router.put('/:id', protect, authorize('Fleet Manager', 'Safety Officer'), async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contact, safetyScore, status } = req.body;

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (name) driver.name = name;
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (licenseCategory) driver.licenseCategory = licenseCategory;
    if (licenseExpiry) driver.licenseExpiry = new Date(licenseExpiry);
    if (contact) driver.contact = contact;
    if (safetyScore !== undefined) driver.safetyScore = safetyScore;
    if (status) driver.status = status;

    const updatedDriver = await driver.save();
    res.json(updatedDriver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Delete a driver
// @route   DELETE /api/drivers/:id
// @access  Private (Fleet Manager / Safety Officer only)
router.delete('/:id', protect, authorize('Fleet Manager', 'Safety Officer'), async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
