/**
 * Audit Log Utilities
 * PaperTrail-style audit logging system
 */

const { pool } = require('../db/pool');

/**
 * Format whodunnit string
 * @param {Object} params
 * @param {Object} params.user - User object with id and email
 * @param {string} params.controller - Controller name (e.g., 'auth', 'pets')
 * @param {string} params.action - Action name (e.g., 'login', 'create')
 * @param {string} params.system - System context (e.g., 'event_generator')
 * @returns {string} Formatted whodunnit string
 */
function formatWhodunnit({ user, controller, action, system }) {
  if (system) {
    return `System:${system}`;
  }

  if (user) {
    const actionStr = action ? `#${action}` : '';
    return `User:${user.id}:${user.email}:${controller}${actionStr}`;
  }

  return 'System:unknown';
}

/**
 * Log an audit event
 * @param {Object} params
 * @param {Object} params.user - User object (optional for system events)
 * @param {string} params.itemType - Type of item affected ('User', 'Pet', 'Caretaker', etc.)
 * @param {number} params.itemId - ID of affected item
 * @param {string} params.eventType - Event type ('create', 'update', 'delete', 'login', etc.)
 * @param {string} params.action - Specific action ('register', 'oauth_login', 'pet_created', etc.)
 * @param {Object} params.object - Snapshot of object after change (optional)
 * @param {Object} params.objectChanges - Changes made: {field: [oldValue, newValue]} (optional)
 * @param {string} params.controller - Controller name (e.g., 'auth', 'pets')
 * @param {string} params.ipAddress - Request IP address (optional)
 * @param {string} params.userAgent - Request user agent (optional)
 * @param {string} params.requestId - Request ID for tracing (optional)
 * @param {string} params.system - System context for system events (optional)
 * @returns {Promise<Object>} Audit log entry
 */
async function logAudit({
  user,
  itemType,
  itemId,
  eventType,
  action,
  object,
  objectChanges,
  controller = 'unknown',
  ipAddress,
  userAgent,
  requestId,
  system
}) {
  const whodunnit = formatWhodunnit({ user, controller, action, system });

  const query = `
    INSERT INTO audit_log (
      user_id,
      whodunnit,
      item_type,
      item_id,
      event_type,
      action,
      object,
      object_changes,
      ip_address,
      user_agent,
      request_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    user ? user.id : null,
    whodunnit,
    itemType,
    itemId,
    eventType,
    action,
    object ? JSON.stringify(object) : null,
    objectChanges ? JSON.stringify(objectChanges) : null,
    ipAddress || null,
    userAgent || null,
    requestId || null
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit failures shouldn't break app flow
    return null;
  }
}

/**
 * Express middleware to attach audit logging to request
 */
function auditMiddleware(req, res, next) {
  // Attach audit logger to request
  req.audit = {
    log: (params) => logAudit({
      ...params,
      user: req.user,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.id // Assuming you have request ID middleware
    })
  };

  next();
}

/**
 * Get audit trail for a specific item
 * @param {string} itemType - Type of item ('User', 'Pet', etc.)
 * @param {number} itemId - ID of item
 * @param {Object} options - Query options
 * @param {number} options.limit - Max records to return
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} Audit log entries
 */
async function getAuditTrail(itemType, itemId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const query = `
    SELECT * FROM audit_log
    WHERE item_type = $1 AND item_id = $2
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `;

  const result = await pool.query(query, [itemType, itemId, limit, offset]);
  return result.rows;
}

/**
 * Get user's recent activity
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Audit log entries
 */
async function getUserActivity(userId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const query = `
    SELECT * FROM audit_log
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, [userId, limit, offset]);
  return result.rows;
}

module.exports = {
  formatWhodunnit,
  logAudit,
  auditMiddleware,
  getAuditTrail,
  getUserActivity
};
