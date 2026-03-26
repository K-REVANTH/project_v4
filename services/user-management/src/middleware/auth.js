const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authentication middleware — verifies JWT and attaches user to req.
 * Extracts token from Authorization: Bearer <token> header.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Authorization header must be: Bearer <token>' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Authorization middleware factory — gates access by role.
 * Usage: authorize('admin') or authorize('doctor', 'admin')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: insufficient permissions',
        requiredRoles: allowedRoles,
        yourRole: req.user.role
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
