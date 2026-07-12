import express from 'express';
import Vehicle from '../models/Vehicle.js';
import { protect, authorize, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all vehicles (with filters)
// @route   GET /api/vehicles
// @access  Private (Any authenticated user)
router.get('/', protect, async (req, res) => {
  const { type, status, region, search } = req.query;
  const query = {};

  if (type) query.type = type;
  if (status) query.status = status;
  if (region) query.region = region;
  if (search) {
    query.$or = [
      { registrationNumber: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const vehicles = await Vehicle.find(query);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Create a vehicle
// @route   POST /api/vehicles
// @access  Private (Fleet Manager only)
router.post('/', protect, checkPermission('Register/Edit Fleet Vehicles'), async (req, res) => {
  const { registrationNumber, name, type, maxCapacity, odometer, acquisitionCost, status, region } = req.body;

  if (!registrationNumber || !name || !type || !maxCapacity || !acquisitionCost) {
    return res.status(400).json({ error: 'Please enter all required fields' });
  }

  try {
    // Check uniqueness
    const regUpper = registrationNumber.toUpperCase().trim();
    const vehicleExists = await Vehicle.findOne({ registrationNumber: regUpper });
    if (vehicleExists) {
      return res.status(400).json({ error: `Vehicle with registration number '${regUpper}' already exists.` });
    }

    const vehicle = await Vehicle.create({
      registrationNumber: regUpper,
      name,
      type,
      maxCapacity,
      odometer: odometer || 0,
      acquisitionCost,
      status: status || 'Available',
      region: region || 'National'
    });

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Update a vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Fleet Manager only)
router.put('/:id', protect, checkPermission('Register/Edit Fleet Vehicles'), async (req, res) => {
  const { registrationNumber, name, type, maxCapacity, odometer, acquisitionCost, status, region } = req.body;

  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (registrationNumber) {
      const regUpper = registrationNumber.toUpperCase().trim();
      if (regUpper !== vehicle.registrationNumber) {
        // Check uniqueness of new reg number
        const vehicleExists = await Vehicle.findOne({ registrationNumber: regUpper });
        if (vehicleExists) {
          return res.status(400).json({ error: `Vehicle with registration number '${regUpper}' already exists.` });
        }
        vehicle.registrationNumber = regUpper;
      }
    }

    if (name) vehicle.name = name;
    if (type) vehicle.type = type;
    if (maxCapacity) vehicle.maxCapacity = maxCapacity;
    if (odometer !== undefined) vehicle.odometer = odometer;
    if (acquisitionCost) vehicle.acquisitionCost = acquisitionCost;
    if (status) vehicle.status = status;
    if (region) vehicle.region = region;

    const updatedVehicle = await vehicle.save();
    res.json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Multer storage for document uploads
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @desc    Upload a document for a vehicle
// @route   POST /api/vehicles/:id/documents
// @access  Private (Fleet Manager only)
router.post('/:id/documents', protect, checkPermission('Register/Edit Fleet Vehicles'), upload.single('document'), async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category || !req.file) {
      return res.status(400).json({ error: 'Please provide document name, category, and a file' });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Save metadata
    const relativePath = `/uploads/${req.file.filename}`;
    const newDoc = {
      name,
      category,
      filePath: relativePath,
      uploadDate: new Date()
    };

    vehicle.documents.push(newDoc);
    await vehicle.save();

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Delete a document from a vehicle
// @route   DELETE /api/vehicles/:id/documents/:docId
// @access  Private (Fleet Manager only)
router.delete('/:id/documents/:docId', protect, checkPermission('Register/Edit Fleet Vehicles'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const docIndex = vehicle.documents.findIndex(d => d._id.toString() === req.params.docId);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found on this vehicle' });
    }

    const document = vehicle.documents[docIndex];

    // Attempt to delete physical file
    const physicalPath = path.join(__dirname, '..', document.filePath);
    if (fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
      } catch (err) {
        console.warn('⚠️ Could not delete physical file:', physicalPath, err.message);
      }
    }

    vehicle.documents.splice(docIndex, 1);
    await vehicle.save();

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Delete a vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Fleet Manager only)
router.delete('/:id', protect, checkPermission('Register/Edit Fleet Vehicles'), async (req, res) => {
  try {
    // Also delete vehicle's physical documents when deleting the vehicle itself
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    for (const doc of vehicle.documents) {
      const physicalPath = path.join(__dirname, '..', doc.filePath);
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (err) {
          console.warn('⚠️ Could not delete physical file on vehicle deletion:', physicalPath, err.message);
        }
      }
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
