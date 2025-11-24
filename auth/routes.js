/**
 * Authentication Routes
 * Registration, Login, OAuth, Password Reset
 */

const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('./passport');
const { pool } = require('../db/pool');
const { generateAccessToken, generateRefreshToken, generatePasswordResetToken, verifyToken } = require('../utils/jwt');
const { logAudit } = require('../utils/audit');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// LOCAL REGISTRATION
// ============================================================================

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username, email, and password are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Username validation (alphanumeric + underscore, 3-50 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username must be 3-50 characters (letters, numbers, underscore only)'
      });
    }

    // Password strength (min 8 chars)
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters'
      });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(`
      INSERT INTO users (
        username, email, password_hash, display_name,
        oauth_provider, email_verified
      ) VALUES ($1, $2, $3, $4, 'local', FALSE)
      RETURNING id, username, email, display_name, created_at
    `, [username, email, passwordHash, displayName || username]);

    const user = result.rows[0];

    // Create default notification preferences
    await pool.query(
      'INSERT INTO notification_preferences (user_id) VALUES ($1)',
      [user.id]
    );

    // Log registration
    await logAudit({
      user,
      itemType: 'User',
      itemId: user.id,
      eventType: 'create',
      action: 'register',
      controller: 'auth',
      object: { id: user.id, email: user.email, username: user.username },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
});

// ============================================================================
// LOCAL LOGIN
// ============================================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if user has a password (might be OAuth-only)
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please sign in with Google or Apple'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Log login
    await logAudit({
      user,
      itemType: 'User',
      itemId: user.id,
      eventType: 'login',
      action: 'login',
      controller: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    try {
      // Generate tokens
      const accessToken = generateAccessToken(req.user);
      const refreshToken = generateRefreshToken(req.user);

      // Redirect to frontend with tokens
      const redirectUrl = process.env.OAUTH_REDIRECT_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}?access_token=${accessToken}&refresh_token=${refreshToken}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

// ============================================================================
// APPLE OAUTH
// ============================================================================

router.get('/apple',
  passport.authenticate('apple', { session: false })
);

router.post('/apple/callback',
  passport.authenticate('apple', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    try {
      const accessToken = generateAccessToken(req.user);
      const refreshToken = generateRefreshToken(req.user);

      const redirectUrl = process.env.OAUTH_REDIRECT_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}?access_token=${accessToken}&refresh_token=${refreshToken}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

// ============================================================================
// REFRESH TOKEN
// ============================================================================

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if it's a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Not a valid refresh token'
      });
    }

    // Get user
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive'
      });
    }

    const user = result.rows[0];

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
});

// ============================================================================
// GET CURRENT USER
// ============================================================================

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, role, email_verified, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user'
    });
  }
});

// ============================================================================
// LOGOUT (client-side token removal, but we can log it)
// ============================================================================

router.post('/logout', authenticate, async (req, res) => {
  try {
    // Log logout event
    await logAudit({
      user: req.user,
      itemType: 'User',
      itemId: req.userId,
      eventType: 'logout',
      action: 'logout',
      controller: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
});

// ============================================================================
// PASSWORD RESET REQUEST
// ============================================================================

router.post('/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required'
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    // Always return success (don't leak if email exists)
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = generatePasswordResetToken(user);

    // Store token in database
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
      [resetToken, user.id]
    );

    // TODO: Send email with reset link
    // For now, just log it
    console.log(`Password reset token for ${email}: ${resetToken}`);

    await logAudit({
      user,
      itemType: 'User',
      itemId: user.id,
      eventType: 'update',
      action: 'password_reset_request',
      controller: 'auth'
    });

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process password reset'
    });
  }
});

// ============================================================================
// PASSWORD RESET CONFIRM
// ============================================================================

router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token and new password are required'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired reset token'
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Not a valid password reset token'
      });
    }

    // Password strength check
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, decoded.id]
    );

    await logAudit({
      user: { id: decoded.id, email: decoded.email },
      itemType: 'User',
      itemId: decoded.id,
      eventType: 'update',
      action: 'password_reset',
      controller: 'auth'
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
