/**
 * Authentication routes
 * Handles user registration, login, logout, and token refresh
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  sanitizeUser
} = require('../services/authService');
const {
  getUserByEmail,
  createUser,
  getRefreshToken,
  createRefreshToken,
  deleteRefreshToken,
  addTokenToBlacklist,
  isTokenBlacklisted
} = require('../services/dataService.new');
const { parseCookies } = require('../services/authService');

/**
 * POST /api/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = createUser(name, email, passwordHash);
    
    // Generate tokens
    const accessToken = generateAccessToken({ userId, email });
    const refreshToken = generateRefreshToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Save refresh token
    createRefreshToken(userId, refreshToken, expiresAt);
    
    // Set cookies
    setAuthCookies(res, { accessToken, refreshToken });
    
    // Return user data
    res.status(201).json({
      user: { id: userId, name, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Save refresh token
    createRefreshToken(user.id, refreshToken, expiresAt);
    
    // Set cookies
    setAuthCookies(res, { accessToken, refreshToken });
    
    // Return user data
    res.json({
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/logout
 * Logout user and invalidate tokens
 */
router.post('/logout', (req, res) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = cookies.refresh_token;
    const accessToken = cookies.access_token;
    
    // Invalidate refresh token
    if (refreshToken) {
      deleteRefreshToken(refreshToken);
    }
    
    // Blacklist access token
    if (accessToken) {
      addTokenToBlacklist(accessToken);
    }
    
    // Clear cookies
    clearAuthCookies(res);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (req, res) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = cookies.refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }
    
    // Verify refresh token exists and not expired
    const tokenRecord = getRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.expires_at < Date.now()) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Generate new access token
    const user = require('../services/dataService.new').getUserById(tokenRecord.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    
    // Set new access token cookie (keep same refresh token)
    setAuthCookies(res, { accessToken, refreshToken });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/session
 * Check if user is authenticated and return user data
 */
router.get('/session', (req, res) => {
  try {
    const cookies = parseCookies(req);
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(accessToken)) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Token invalidated' });
    }
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const { ENV } = require('../config/constants');
    
    try {
      const payload = jwt.verify(accessToken, ENV.JWT_SECRET);
      const user = require('../services/dataService.new').getUserById(payload.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      res.json({ user: sanitizeUser(user) });
    } catch (jwtError) {
      // Token expired or invalid - try to refresh
      const refreshToken = cookies.refresh_token;
      if (refreshToken) {
        const tokenRecord = getRefreshToken(refreshToken);
        if (tokenRecord && tokenRecord.expires_at > Date.now()) {
          const user = require('../services/dataService.new').getUserById(tokenRecord.user_id);
          if (user) {
            const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
            setAuthCookies(res, { accessToken: newAccessToken, refreshToken });
            return res.json({ user: sanitizeUser(user) });
          }
        }
      }
      
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Token expired' });
    }
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
