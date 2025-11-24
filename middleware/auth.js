/**
 * Authentication Middleware
 * JWT-based authentication for protected routes
 */

const { verifyToken } = require('../utils/jwt');
const { pool } = require('../db/pool');

/**
 * Authenticate JWT token from Authorization header
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user to request if valid token present
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);

    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = result.rows[0];
      req.userId = result.rows[0].id;
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

/**
 * Require specific role
 * Must be used after authenticate middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Check if user can access a pet (owner or caretaker)
 */
async function canAccessPet(req, res, next) {
  try {
    const petId = req.params.id || req.params.petId;
    const userId = req.userId;

    if (!petId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Pet ID required'
      });
    }

    // Use database function to check access
    const result = await pool.query(
      'SELECT can_access_pet($1, $2) as can_access',
      [userId, petId]
    );

    if (!result.rows[0].can_access) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this pet'
      });
    }

    // Store petId in request for convenience
    req.petId = parseInt(petId);
    next();
  } catch (error) {
    console.error('Pet access check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify pet access'
    });
  }
}

/**
 * Check if user is owner of pet (not just caretaker)
 */
async function requirePetOwner(req, res, next) {
  try {
    const petId = req.params.id || req.params.petId;
    const userId = req.userId;

    const result = await pool.query(
      'SELECT owner_id FROM pets WHERE id = $1',
      [petId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pet not found'
      });
    }

    if (result.rows[0].owner_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the owner can perform this action'
      });
    }

    next();
  } catch (error) {
    console.error('Owner check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify ownership'
    });
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  canAccessPet,
  requirePetOwner
};
