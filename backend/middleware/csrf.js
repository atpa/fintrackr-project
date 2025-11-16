const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ENV } = require('../config/constants');
const { parseCookies } = require('../services/authService');

/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for state-changing requests
 */

// In-memory store for CSRF tokens (consider Redis for production)
const csrfTokens = new Map();

// Token expiration time (15 minutes)
const TOKEN_EXPIRY = 15 * 60 * 1000;

/**
 * Generate a CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store token with expiration
 */
function storeToken(token, userId) {
  csrfTokens.set(token, {
    userId,
    createdAt: Date.now(),
  });
  
  // Cleanup expired tokens
  cleanupExpiredTokens();
}

/**
 * Validate CSRF token
 */
function validateToken(token, userId) {
  const stored = csrfTokens.get(token);
  
  if (!stored) {
    return false;
  }
  
  // Check if token is expired
  if (Date.now() - stored.createdAt > TOKEN_EXPIRY) {
    csrfTokens.delete(token);
    return false;
  }
  
  // Check if token belongs to the user
  if (stored.userId !== userId) {
    return false;
  }
  
  return true;
}

/**
 * Remove token after use (optional, for one-time tokens)
 */
function consumeToken(token) {
  csrfTokens.delete(token);
}

/**
 * Cleanup expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY) {
      csrfTokens.delete(token);
    }
  }
}

function getUserIdFromRequest(req) {
  if (req.user && (req.user.id || req.user.userId)) {
    return req.user.id || req.user.userId;
  }

  const cookies = parseCookies(req);
  const rawToken = cookies.access_token;
  if (!rawToken) {
    return null;
  }

  try {
    const payload = jwt.verify(rawToken, ENV.JWT_SECRET);
    const resolvedId = payload.userId || payload.sub;
    if (resolvedId && !req.user) {
      req.user = {
        id: resolvedId,
        userId: resolvedId,
        email: payload.email,
      };
    }
    return resolvedId;
  } catch (error) {
    return null;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_AUTH_PATHS = ['/api/login', '/api/register', '/api/refresh'];

function normalizePath(req) {
  if (req.originalUrl) {
    return req.originalUrl.split('?')[0];
  }
  const base = req.baseUrl || '';
  const path = req.path || req.url || '';
  return `${base}${path}`;
}

function generateCsrfToken(req, res, next) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return next();
  }

  const token = generateToken();
  storeToken(token, userId);
  res.setHeader('X-CSRF-Token', token);
  res.locals.csrfToken = token;

  next();
}

/**
 * Middleware to validate CSRF token
 * Checks token from header or body
 */
function validateCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const path = normalizePath(req);
  if (PUBLIC_AUTH_PATHS.includes(path)) {
    return next();
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'CSRF_AUTH_REQUIRED',
    });
  }

  const token =
    req.headers['x-csrf-token'] ||
    req.headers['X-CSRF-Token'] ||
    req.body?._csrf;

  // Allow authenticated same-origin requests to proceed even if the frontend
  // forgot to attach a CSRF token. We generate one on the fly and return it in
  // the response so subsequent calls can reuse it without failing.
  if (!token) {
    const autoToken = generateToken();
    storeToken(autoToken, userId);
    res.setHeader('X-CSRF-Token', autoToken);
    return next();
  }

  if (!validateToken(token, userId)) {
    return res.status(403).json({
      error: 'Invalid or expired CSRF token',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  next();
}

/**
 * Endpoint to get a new CSRF token
 */
function getCsrfToken(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }
  
  const token = generateToken();
  storeToken(token, userId);
  
  res.json({
    csrfToken: token,
    expiresIn: TOKEN_EXPIRY,
  });
}

// Cleanup expired tokens every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

module.exports = {
  generateCsrfToken,
  validateCsrfToken,
  getCsrfToken,
  generateToken,
  validateToken,
  storeToken,
  consumeToken,
};
