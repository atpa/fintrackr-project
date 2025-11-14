/**
 * Authentication Routes
 * Public endpoints for user authentication
 */

const { usersRepo } = require("../repositories");
const authService = require("../services/authService");
const { HttpError } = require("../middleware");

/**
 * POST /api/register
 * Register new user
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw new HttpError("Missing required fields", 400);
  }

  // Check if user already exists
  if (usersRepo.emailExists(email)) {
    throw new HttpError("User with this email already exists", 400);
  }

  // Create user (legacy sha256 hash via repository)
  const user = await usersRepo.create({ name, email, password });

  // Generate tokens
  const tokens = authService.generateTokens(user);

  // Set cookies
  authService.setAuthCookies(res, tokens);

  // Return sanitized user
  const sanitized = authService.sanitizeUser(user);

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(sanitized));
}

/**
 * POST /api/login
 * Login user
 */
async function login(req, res) {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new HttpError("Missing email or password", 400);
  }

  // Find user
  const user = usersRepo.findByEmail(email);
  if (!user) {
    throw new HttpError("Invalid credentials", 401);
  }

  // Verify password: first bcrypt, then legacy sha256 fallback
  let isValid = false;
  try {
    isValid = await authService.verifyPassword(password, user.password_hash);
  } catch (e) {
    isValid = false;
  }
  if (!isValid) {
    const crypto = require("crypto");
    const legacy = crypto.createHash("sha256").update(String(password)).digest("hex");
    if (legacy === user.password_hash) {
      isValid = true;
      // Optional upgrade path: keep legacy for tests, skip re-hash
    }
  }
  if (!isValid) throw new HttpError("Invalid credentials", 401);

  // Generate tokens
  const tokens = authService.generateTokens(user);

  // Set cookies
  authService.setAuthCookies(res, tokens);

  // Return sanitized user
  const sanitized = authService.sanitizeUser(user);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(sanitized));
}

/**
 * POST /api/logout
 * Logout user
 */
async function logout(req, res) {
  const cookies = authService.parseCookies(req);
  const accessToken = cookies.access_token;

  if (accessToken) {
    // Blacklist token
    authService.blacklistToken(accessToken);
  }

  // Clear cookies
  authService.clearAuthCookies(res);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

/**
 * GET /api/session
 * Check session and refresh if needed
 */
async function checkSession(req, res) {
  const cookies = authService.parseCookies(req);
  const accessToken = cookies.access_token;
  const refreshToken = cookies.refresh_token;

  // Try to verify access token
  let payload = authService.verifyAccessToken(accessToken);

  if (!payload && refreshToken) {
    // Access token expired, try refresh
    const refreshPayload = authService.verifyRefreshToken(refreshToken);
    
    if (refreshPayload && authService.isRefreshTokenValid(refreshPayload.userId, refreshToken)) {
      // Generate new access token
      const user = usersRepo.findById(refreshPayload.userId);
      if (user) {
        const newTokens = authService.generateTokens(user);
        authService.setAuthCookies(res, newTokens);
        payload = authService.verifyAccessToken(newTokens.accessToken);
      }
    }
  }

  if (!payload) {
    throw new HttpError("Invalid session", 401);
  }

  // Get user
  const user = usersRepo.findById(payload.userId);
  if (!user) {
    throw new HttpError("User not found", 404);
  }

  const sanitized = authService.sanitizeUser(user);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(sanitized));
}

module.exports = {
  register,
  login,
  logout,
  checkSession,
};
