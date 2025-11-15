/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */

const jwt = require('jsonwebtoken');
const { ENV } = require('../config/constants');
const { parseCookies } = require('../services/authService');
const { isTokenBlacklisted } = require('../services/dataService.new');

/**
 * Authenticate request using JWT from cookies
 * Attaches user info to req.user if valid
 */
function authenticateRequest(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(accessToken)) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }
    
    // Verify token
    try {
      const payload = jwt.verify(accessToken, ENV.JWT_SECRET);
      req.user = {
        userId: payload.userId,
        email: payload.email
      };
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Used for public endpoints that benefit from user context
 */
function optionalAuth(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const accessToken = cookies.access_token;
    
    if (accessToken && !isTokenBlacklisted(accessToken)) {
      try {
        const payload = jwt.verify(accessToken, ENV.JWT_SECRET);
        req.user = {
          userId: payload.userId,
          email: payload.email
        };
      } catch (jwtError) {
        // Ignore errors for optional auth
      }
    }
    
    next();
  } catch (error) {
    next(); // Continue even on error
  }
}

module.exports = {
  authenticateRequest,
  optionalAuth
};
