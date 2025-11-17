/**
 * Request Timeout Middleware
 * Prevents requests from hanging indefinitely
 */

const { AppError } = require('./errorHandler');

/**
 * Timeout middleware - aborts long-running requests
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30 seconds)
 */
function requestTimeout(timeoutMs = 30000) {
  return function timeoutMiddleware(req, res, next) {
    // Set timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        // Log timeout for debugging
        console.error(`[Timeout] Request timeout after ${timeoutMs}ms:`, {
          method: req.method,
          url: req.url,
          ip: req.ip || req.connection.remoteAddress
        });
        
        // Send timeout error
        const error = new AppError('Request timeout', 408);
        error.code = 'REQUEST_TIMEOUT';
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    // Clear timeout on error
    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Async operation timeout wrapper
 * Use for long-running operations like bcrypt or database queries
 */
function withTimeout(promise, timeoutMs, errorMessage = 'Operation timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError(errorMessage, 408));
      }, timeoutMs);
    })
  ]);
}

module.exports = {
  requestTimeout,
  withTimeout
};
