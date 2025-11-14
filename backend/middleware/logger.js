/**
 * Request logging middleware
 * Logs HTTP requests with timing information
 */

/**
 * Format timestamp
 */
function formatTimestamp() {
  const now = new Date();
  return now.toISOString();
}

/**
 * Get colored status code
 */
function getStatusColor(statusCode) {
  if (statusCode >= 500) return "\x1b[31m"; // Red
  if (statusCode >= 400) return "\x1b[33m"; // Yellow
  if (statusCode >= 300) return "\x1b[36m"; // Cyan
  if (statusCode >= 200) return "\x1b[32m"; // Green
  return "\x1b[0m"; // Reset
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url } = req;

  // Log request start
  console.log(`[${formatTimestamp()}] ${method} ${url}`);

  // Override res.end to log when response completes
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const statusColor = getStatusColor(res.statusCode);
    const reset = "\x1b[0m";

    console.log(
      `[${formatTimestamp()}] ${method} ${url} ${statusColor}${res.statusCode}${reset} ${duration}ms`
    );

    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Error logging middleware
 */
function errorLogger(err, req, res, next) {
  console.error(`[${formatTimestamp()}] ERROR:`, err);
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
};
