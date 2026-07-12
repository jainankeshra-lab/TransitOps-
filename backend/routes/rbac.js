import express from 'express';
import RBAC from '../models/RBAC.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/rbac: Get current permissions matrix (open to authenticated users)
router.get('/', protect, async (req, res) => {
  try {
    const rbac = await RBAC.findOne({ key: 'current_matrix' });
    if (!rbac) {
      return res.status(404).json({ error: 'RBAC permissions matrix not found.' });
    }
    res.json(rbac.permissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings: ' + err.message });
  }
});

// POST /api/rbac: Update permissions matrix (restricted to Fleet Manager!)
router.post('/', protect, authorize('Fleet Manager'), async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Invalid permissions format.' });
    }

    let rbac = await RBAC.findOne({ key: 'current_matrix' });
    if (!rbac) {
      rbac = new RBAC({ key: 'current_matrix', permissions });
    } else {
      rbac.permissions = permissions;
    }

    await rbac.save();
    res.json({ message: 'Permissions updated successfully.', permissions: rbac.permissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings: ' + err.message });
  }
});

export default router;
