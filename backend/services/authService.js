/**
 * Authentication service
 * Handles JWT tokens, cookies, and user authentication
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ENV, TOKEN_CONFIG } = require("../config/constants");
const dataService = require("./dataService.new");

/**
 * Parse cookies from request headers
 */
function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie;
  if (!header) return cookies;
  header.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    const value = rest.join("=").trim();
    if (name) cookies[name.trim()] = decodeURIComponent(value);
  });
  return cookies;
}

/**
 * Build cookie string with options
 */
function buildCookie(name, value, options = {}) {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; Path=${options.path || "/"}`;
  if (options.httpOnly !== false) cookie += "; HttpOnly";
  if (options.maxAge != null) cookie += `; Max-Age=${options.maxAge}`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.secure) cookie += "; Secure";
  return cookie;
}

/**
 * Set authentication cookies
 */
function setAuthCookies(res, tokens, options = {}) {
  const sameSite = options.sameSite || ENV.COOKIE_SAMESITE || "Lax";
  const secure =
    options.secure !== undefined ? options.secure : ENV.COOKIE_SECURE;
  const cookies = [
    buildCookie("access_token", tokens.accessToken, {
      maxAge: TOKEN_CONFIG.ACCESS_TTL_SECONDS,
      sameSite,
      secure,
    }),
    buildCookie("refresh_token", tokens.refreshToken, {
      maxAge: TOKEN_CONFIG.REFRESH_TTL_SECONDS,
      sameSite,
      secure,
    }),
  ];
  res.setHeader("Set-Cookie", cookies);
}

/**
 * Clear authentication cookies
 */
function clearAuthCookies(res, options = {}) {
  const sameSite = options.sameSite || ENV.COOKIE_SAMESITE || "Lax";
  const secure =
    options.secure !== undefined ? options.secure : ENV.COOKIE_SECURE;
  const cookies = [
    buildCookie("access_token", "", { maxAge: 0, sameSite, secure }),
    buildCookie("refresh_token", "", { maxAge: 0, sameSite, secure }),
  ];
  res.setHeader("Set-Cookie", cookies);
}

/**
 * Remove user password hash from object
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...clean } = user;
  return clean;
}

/**
 * Generate access token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      email: payload.email,
    },
    ENV.JWT_SECRET,
    {
      expiresIn: TOKEN_CONFIG.ACCESS_TTL_SECONDS,
      jwtid: crypto.randomBytes(16).toString("hex"),
    }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken() {
  return jwt.sign(
    { type: 'refresh' },
    ENV.JWT_SECRET,
    {
      expiresIn: TOKEN_CONFIG.REFRESH_TTL_SECONDS,
      jwtid: crypto.randomBytes(32).toString("hex"),
    }
  );
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    return { valid: true, payload: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Issue JWT tokens for user
 */
function issueTokensForUser(user) {
  const now = Date.now();

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken();

  // Store refresh token in SQLite
  const expiresAt = new Date(now + TOKEN_CONFIG.REFRESH_TTL_SECONDS * 1000).toISOString();
  dataService.createRefreshToken(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

/**
 * Consume refresh token (remove from storage)
 */
function consumeRefreshToken(token) {
  dataService.deleteRefreshToken(token);
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(token) {
  return dataService.isTokenBlacklisted(token);
}

/**
 * Add token to blacklist
 */
function addTokenToBlacklist(token) {
  dataService.addTokenToBlacklist(token);
}

/**
 * Cleanup expired tokens from storage
 */
function cleanupTokenStores() {
  // SQLite handles expiration via WHERE clauses in queries
  // Optionally call deleteExpiredRefreshTokens if needed
  dataService.deleteExpiredRefreshTokens();
}

/**
 * Authenticate request using JWT tokens from cookies
 */
function authenticateRequest(req) {
  const cookies = parseCookies(req);
  let token = cookies.access_token;
  let isRefresh = false;

  if (!token) {
    token = cookies.refresh_token;
    isRefresh = true;
  }

  if (!token) {
    return { ok: false, error: "No token provided" };
  }

  if (isTokenBlacklisted(token)) {
    return { ok: false, error: "Token revoked" };
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const resolvedUserId = decoded.userId || decoded.sub;
    const user = dataService.getUserById(resolvedUserId);

    if (!user) {
      return { ok: false, error: "User not found" };
    }

    if (isRefresh) {
      const refreshEntry = dataService.getRefreshToken(token);
      if (!refreshEntry) {
        return { ok: false, error: "Invalid refresh token" };
      }
    }

    return {
      ok: true,
      user: sanitizeUser(user),
      isRefresh,
      tokenPayload: decoded,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

module.exports = {
  parseCookies,
  buildCookie,
  setAuthCookies,
  clearAuthCookies,
  sanitizeUser,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  issueTokensForUser,
  consumeRefreshToken,
  isTokenBlacklisted,
  addTokenToBlacklist,
  cleanupTokenStores,
  authenticateRequest,
  hashPassword,
  comparePassword,
};
