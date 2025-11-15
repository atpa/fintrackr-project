const crypto = require('crypto');

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

/**
 * Middleware to generate CSRF token
 * Adds token to response for client to store
 */
function generateCsrfToken(req, res, next) {
  // Only generate for authenticated users
  if (!req.user || !req.user.id) {
    return next();
  }
  
  const token = generateToken();
  storeToken(token, req.user.id);
  
  // Add token to response header
  res.setHeader('X-CSRF-Token', token);
  
  // Also make it available in res.locals for templates
  res.locals.csrfToken = token;
  
  next();
}

/**
 * Middleware to validate CSRF token
 * Checks token from header or body
 */
function validateCsrfToken(req, res, next) {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip if user not authenticated (handled by auth middleware)
  if (!req.user || !req.user.id) {
    return next();
  }
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  
  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    });
  }
  
  // Validate token
  if (!validateToken(token, req.user.id)) {
    return res.status(403).json({
      error: 'Invalid or expired CSRF token',
      code: 'CSRF_TOKEN_INVALID',
    });
  }
  
  // Optionally consume token (for one-time use)
  // consumeToken(token);
  
  next();
}

/**
 * Endpoint to get a new CSRF token
 */
function getCsrfToken(req, res) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }
  
  const token = generateToken();
  storeToken(token, req.user.id);
  
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
