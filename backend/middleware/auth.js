import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RBAC from '../models/RBAC.js';

// Protect routes - requires authentication
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'transitops_super_secret_key_123!');

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }
};

// Authorize roles - restricts to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Role '${req.user.role}' is not authorized to access this resource` 
      });
    }

    next();
  };
};

// Check permissions dynamically against Database RBAC configuration
export const checkPermission = (featureName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const rbac = await RBAC.findOne({ key: 'current_matrix' });
      if (!rbac) {
        // Fallback to basic authorize mapping if database row is empty
        return next();
      }

      const permRow = rbac.permissions.find(p => p.feature === featureName);
      if (!permRow) {
        return res.status(403).json({ error: `Access denied. Feature '${featureName}' is not defined.` });
      }

      const role = req.user.role;
      let hasAccess = false;

      if (role === 'Fleet Manager') hasAccess = permRow.manager;
      else if (role === 'Driver') hasAccess = permRow.driver;
      else if (role === 'Safety Officer') hasAccess = permRow.safety;
      else if (role === 'Financial Analyst') hasAccess = permRow.analyst;

      if (!hasAccess) {
        return res.status(403).json({ 
          error: `Access denied. Role '${role}' does not have '${featureName}' permission in system settings.` 
        });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Authorization check failed: ' + err.message });
    }
  };
};
