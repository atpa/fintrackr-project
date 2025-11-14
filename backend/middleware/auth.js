/**
 * Authentication middleware
 * Validates JWT tokens and attaches user to request
 */

const { authenticateRequest } = require("../services/authService");

/**
 * List of public endpoints that don't require authentication
 */
const PUBLIC_ENDPOINTS = [
  "/api/register",
  "/api/login",
  "/api/logout",
  "/api/session",
  "/api/banks",
  "/api/rates",
  "/api/convert",
];

/**
 * Check if endpoint is public
 */
function isPublicEndpoint(pathname) {
  return PUBLIC_ENDPOINTS.some((endpoint) => pathname === endpoint);
}

/**
 * Authentication middleware
 * Attaches user to req.user if authenticated
 */
function authMiddleware(req, res, next) {
  // Parse pathname from URL string
  const pathname = req.url.split("?")[0];
  
  // Skip auth for public endpoints
  if (isPublicEndpoint(pathname)) {
    return next();
  }

  const result = authenticateRequest(req);

  if (!result.ok) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: result.error || "Unauthorized" }));
    return;
  }

  // Attach user to request
  req.user = result.user;
  req.isRefresh = result.isRefresh;

  next();
}

/**
 * Optional auth middleware
 * Attaches user if token present, but doesn't fail if missing
 */
function optionalAuthMiddleware(req, res, next) {
  const result = authenticateRequest(req);

  if (result.ok) {
    req.user = result.user;
    req.isRefresh = result.isRefresh;
  }

  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  isPublicEndpoint,
};
