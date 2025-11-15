/**
 * HTTP response utilities
 * Standardized response helpers
 */

/**
 * Send JSON response
 * @param {object} res - HTTP response object
 * @param {object} data - Data to send
 * @param {number} statusCode - HTTP status code
 */
function sendJson(res, data, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 * @param {object} res - HTTP response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
function sendError(res, message, statusCode = 500) {
  sendJson(res, { error: message }, statusCode);
}

/**
 * Send success response
 * @param {object} res - HTTP response object
 * @param {object} data - Data to send
 * @param {number} statusCode - HTTP status code
 */
function sendSuccess(res, data, statusCode = 200) {
  sendJson(res, data, statusCode);
}

/**
 * Parse request body as JSON
 * @param {object} req - HTTP request object
 * @returns {Promise<object>} Parsed JSON body
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Parse user ID from various sources
 * @param {string|number} value - Value to parse
 * @returns {number|null} Parsed user ID or null
 */
function parseUserId(value) {
  if (value == null) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Check if API request is public (doesn't require auth)
 * @param {string} method - HTTP method
 * @param {string} pathname - Request pathname
 * @returns {boolean} True if public
 */
function isPublicApiRequest(method, pathname) {
  const publicPaths = ["/api/register", "/api/login", "/api/rates", "/api/convert"];
  return publicPaths.includes(pathname);
}

module.exports = {
  sendJson,
  sendError,
  sendSuccess,
  parseBody,
  parseUserId,
  isPublicApiRequest,
};
