/**
 * Authentication service
 * Handles JWT tokens, cookies, and user authentication
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ENV, TOKEN_CONFIG } = require("../config/constants");
const { getData, persistData } = require("./dataService");

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
 * Issue JWT tokens for user
 */
function issueTokensForUser(user) {
  const data = getData();
  const now = Date.now();

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    ENV.JWT_SECRET,
    {
      expiresIn: TOKEN_CONFIG.ACCESS_TTL_SECONDS,
      jwtid: crypto.randomBytes(16).toString("hex"),
    }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, email: user.email },
    ENV.JWT_SECRET,
    {
      expiresIn: TOKEN_CONFIG.REFRESH_TTL_SECONDS,
      jwtid: crypto.randomBytes(16).toString("hex"),
    }
  );

  data.refreshTokens.push({
    token: refreshToken,
    userId: user.id,
    expiresAt: now + TOKEN_CONFIG.REFRESH_TTL_SECONDS * 1000,
  });

  persistData();
  return { accessToken, refreshToken };
}

/**
 * Consume refresh token (remove from storage)
 */
function consumeRefreshToken(token) {
  const data = getData();
  const index = data.refreshTokens.findIndex((entry) => entry.token === token);
  if (index >= 0) {
    data.refreshTokens.splice(index, 1);
    persistData();
  }
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(token) {
  const data = getData();
  return data.tokenBlacklist.some((entry) => entry.token === token);
}

/**
 * Add token to blacklist
 */
function addTokenToBlacklist(token, expiresAt) {
  const data = getData();
  if (!expiresAt) {
    try {
      const decoded = jwt.decode(token);
      expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 3600000;
    } catch (e) {
      expiresAt = Date.now() + 3600000;
    }
  }
  data.tokenBlacklist.push({ token, expiresAt });
  persistData();
}

/**
 * Cleanup expired tokens from storage
 */
function cleanupTokenStores() {
  const data = getData();
  const now = Date.now();
  const refreshBefore = data.refreshTokens.length;
  const blacklistBefore = data.tokenBlacklist.length;

  data.refreshTokens = data.refreshTokens.filter(
    (entry) => entry && entry.expiresAt && entry.expiresAt > now
  );

  data.tokenBlacklist = data.tokenBlacklist.filter(
    (entry) => entry && entry.expiresAt && entry.expiresAt > now
  );

  if (
    refreshBefore !== data.refreshTokens.length ||
    blacklistBefore !== data.tokenBlacklist.length
  ) {
    persistData();
  }
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
    const data = getData();
    const user = data.users.find((u) => u.id === decoded.sub);

    if (!user) {
      return { ok: false, error: "User not found" };
    }

    if (isRefresh) {
      const refreshEntry = data.refreshTokens.find((e) => e.token === token);
      if (!refreshEntry) {
        return { ok: false, error: "Invalid refresh token" };
      }
    }

    return { ok: true, user: sanitizeUser(user), isRefresh };
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
  issueTokensForUser,
  consumeRefreshToken,
  isTokenBlacklisted,
  addTokenToBlacklist,
  cleanupTokenStores,
  authenticateRequest,
  hashPassword,
  comparePassword,
};
