# Authentication Setup Guide

## Overview

Pixel Buddy now supports multiple authentication methods:
- **Local Authentication**: Email/password registration and login
- **Google OAuth**: Sign in with Google
- **Apple Sign In**: Sign in with Apple
- **JWT Tokens**: Secure, stateless authentication

## Quick Start

### 1. Database Migration

Run the v2 migration to create the new schema:

```bash
npm run db:migrate:v2
```

This will:
- Create `users`, `caretakers`, `game_events`, `audit_log`, and other new tables
- Migrate existing pets to a migration user
- Set up indexes and triggers

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required:**
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
DATABASE_URL=postgresql://postgres:pixel_secret_2025@localhost:5432/pixel_buddy
```

**Optional (for OAuth):**
- Google OAuth credentials
- Apple Sign In credentials

### 3. Start the Server

```bash
npm run dev
```

## OAuth Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (local)
   - `https://yourdomain.com/api/auth/google/callback` (production)
7. Copy Client ID and Client Secret to `.env`:

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### Apple Sign In Setup

1. Go to [Apple Developer](https://developer.apple.com/)
2. Register an App ID with "Sign in with Apple" capability
3. Create a Service ID
4. Create a Key for "Sign in with Apple"
5. Download the private key (.p8 file)
6. Configure in `.env`:

```env
APPLE_CLIENT_ID=com.your-app.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=http://localhost:3000/api/auth/apple/callback
```

**Note:** Apple private key format is multiline. Keep the newlines in your `.env` file.

## API Endpoints

### Authentication

#### Register (Local)
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login (Local)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Google OAuth
```http
GET /api/auth/google
```

Redirects to Google OAuth consent screen. After approval, redirects back to:
```
/api/auth/google/callback
```

Which then redirects to your frontend with tokens:
```
http://localhost:3000?access_token=xxx&refresh_token=xxx
```

#### Apple Sign In
```http
GET /api/auth/apple
```

Similar flow to Google OAuth.

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "avatarUrl": null,
    "role": "user",
    "emailVerified": false,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

Logs the event in audit trail. Client should delete tokens.

#### Password Reset Request
```http
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Password Reset Confirm
```http
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123"
}
```

## Using Authentication in Frontend

### Registration Flow

```javascript
async function register(username, email, password, displayName) {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, displayName })
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);

    // Redirect to app
    window.location.href = '/dashboard';
  }
}
```

### Login Flow

```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    window.location.href = '/dashboard';
  }
}
```

### Making Authenticated Requests

```javascript
async function getMyPets() {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/pets', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return await response.json();
}
```

### Handling Token Refresh

```javascript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  }

  // Refresh failed - redirect to login
  window.location.href = '/login';
}

// Fetch with auto-refresh
async function authenticatedFetch(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // If 401, try refreshing token
  if (response.status === 401) {
    accessToken = await refreshAccessToken();

    // Retry request with new token
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }

  return response;
}
```

### OAuth Flow (Frontend)

For OAuth, redirect users to the OAuth endpoint:

```javascript
function loginWithGoogle() {
  window.location.href = 'http://localhost:3000/api/auth/google';
}

function loginWithApple() {
  window.location.href = 'http://localhost:3000/api/auth/apple';
}
```

After OAuth callback, extract tokens from URL:

```javascript
// On redirect page (e.g., index.html)
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');
const refreshToken = urlParams.get('refresh_token');

if (accessToken && refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // Clear URL params
  window.history.replaceState({}, document.title, window.location.pathname);

  // Redirect to app
  window.location.href = '/dashboard';
}
```

## Audit Logging

Every important action is logged to the `audit_log` table:

- User registration
- Login/logout
- Password changes
- Pet creation
- Game event resolution
- Caretaker invitations

**Whodunnit Format:**
- User actions: `User:{id}:{email}:controller#action`
- System actions: `System:{context}`

Example:
```
User:42:alice@example.com:auth#register
System:event_generator
```

## Security Best Practices

1. **JWT_SECRET**: Use a strong, random secret (min 32 characters)
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store tokens in httpOnly cookies (recommended) or localStorage
4. **Token Expiration**: Access tokens expire in 7 days, refresh in 30 days
5. **Password Policy**: Minimum 8 characters (enforce stronger in production)
6. **Rate Limiting**: Auth endpoints are rate-limited

## Next Steps

- [ ] Configure OAuth providers
- [ ] Set up email service for password reset
- [ ] Implement email verification
- [ ] Add 2FA (future enhancement)
- [ ] Set up monitoring (Sentry, LogRocket)

## Troubleshooting

### OAuth Redirect Mismatch
Make sure callback URLs match exactly in OAuth provider settings and `.env` file.

### Invalid Token Errors
- Check JWT_SECRET is set and consistent
- Verify token hasn't expired
- Ensure token is sent with `Bearer ` prefix

### Migration Issues
- Ensure database is running
- Check DATABASE_URL is correct
- Review migration logs for specific errors

## Support

For issues, see [GitHub Issues](https://github.com/cjunks94/pixel-buddy/issues).
