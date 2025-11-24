/**
 * Passport OAuth Configuration
 * Google and Apple Sign In
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const { pool } = require('../db/pool');
const { logAudit } = require('../utils/audit');

// ============================================================================
// GOOGLE OAUTH STRATEGY
// ============================================================================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const email = profile.emails[0].value;
      const googleId = profile.id;
      const displayName = profile.displayName;
      const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      // Check if user exists by Google ID
      let result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      let user;

      if (result.rows.length > 0) {
        // User exists - update last login
        user = result.rows[0];

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
          action: 'oauth_google',
          controller: 'auth',
          system: null
        });
      } else {
        // Check if email already exists (user might have registered locally)
        result = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length > 0) {
          // Link Google account to existing user
          user = result.rows[0];

          await pool.query(
            'UPDATE users SET google_id = $1, oauth_provider = $2, last_login_at = NOW() WHERE id = $3',
            [googleId, 'google', user.id]
          );

          await logAudit({
            user,
            itemType: 'User',
            itemId: user.id,
            eventType: 'update',
            action: 'oauth_link_google',
            controller: 'auth',
            objectChanges: { google_id: [null, googleId] }
          });
        } else {
          // Create new user
          // Generate unique username from email
          let username = email.split('@')[0];
          let usernameExists = true;
          let attempts = 0;

          while (usernameExists && attempts < 10) {
            const checkResult = await pool.query(
              'SELECT 1 FROM users WHERE username = $1',
              [username]
            );

            if (checkResult.rows.length === 0) {
              usernameExists = false;
            } else {
              username = `${email.split('@')[0]}${Math.floor(Math.random() * 10000)}`;
              attempts++;
            }
          }

          result = await pool.query(`
            INSERT INTO users (
              username, email, google_id, oauth_provider,
              display_name, avatar_url, email_verified, last_login_at
            ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
            RETURNING *
          `, [username, email, googleId, 'google', displayName, avatarUrl]);

          user = result.rows[0];

          // Create default notification preferences
          await pool.query(
            'INSERT INTO notification_preferences (user_id) VALUES ($1)',
            [user.id]
          );

          await logAudit({
            user,
            itemType: 'User',
            itemId: user.id,
            eventType: 'create',
            action: 'register_google',
            controller: 'auth',
            object: { id: user.id, email: user.email, username: user.username }
          });
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  console.warn('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
}

// ============================================================================
// APPLE OAUTH STRATEGY
// ============================================================================

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY,
    callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, idToken, profile, done) => {
    try {
      // Apple provides minimal profile info
      const email = profile.email;
      const appleId = profile.sub;
      const displayName = profile.name ? `${profile.name.firstName} ${profile.name.lastName}`.trim() : null;

      // Check if user exists by Apple ID
      let result = await pool.query(
        'SELECT * FROM users WHERE apple_id = $1',
        [appleId]
      );

      let user;

      if (result.rows.length > 0) {
        // User exists - update last login
        user = result.rows[0];

        await pool.query(
          'UPDATE users SET last_login_at = NOW() WHERE id = $1',
          [user.id]
        );

        await logAudit({
          user,
          itemType: 'User',
          itemId: user.id,
          eventType: 'login',
          action: 'oauth_apple',
          controller: 'auth'
        });
      } else {
        // Check if email exists
        if (email) {
          result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );

          if (result.rows.length > 0) {
            // Link Apple account to existing user
            user = result.rows[0];

            await pool.query(
              'UPDATE users SET apple_id = $1, oauth_provider = $2, last_login_at = NOW() WHERE id = $3',
              [appleId, 'apple', user.id]
            );

            await logAudit({
              user,
              itemType: 'User',
              itemId: user.id,
              eventType: 'update',
              action: 'oauth_link_apple',
              controller: 'auth',
              objectChanges: { apple_id: [null, appleId] }
            });

            return done(null, user);
          }
        }

        // Create new user
        const username = email ? email.split('@')[0] : `apple_user_${Date.now()}`;

        result = await pool.query(`
          INSERT INTO users (
            username, email, apple_id, oauth_provider,
            display_name, email_verified, last_login_at
          ) VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
          RETURNING *
        `, [username, email || null, appleId, 'apple', displayName]);

        user = result.rows[0];

        // Create default notification preferences
        await pool.query(
          'INSERT INTO notification_preferences (user_id) VALUES ($1)',
          [user.id]
        );

        await logAudit({
          user,
          itemType: 'User',
          itemId: user.id,
          eventType: 'create',
          action: 'register_apple',
          controller: 'auth',
          object: { id: user.id, email: user.email, username: user.username }
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('Apple OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  console.warn('⚠️  Apple OAuth not configured (missing APPLE_CLIENT_ID, APPLE_TEAM_ID, or APPLE_KEY_ID)');
}

// ============================================================================
// PASSPORT SERIALIZATION (for session-based auth if needed)
// ============================================================================

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, role, is_active FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return done(null, false);
    }

    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
