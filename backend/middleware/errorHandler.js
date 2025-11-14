/**
 * Error handling middleware
 * Catches and formats errors
 */

/**
 * Error response formatter
 */
function formatErrorResponse(err, isDevelopment = false) {
  const response = {
    error: err.message || "Internal server error",
  };

  // Add stack trace in development mode
  if (isDevelopment && err.stack) {
    response.stack = err.stack.split("\n");
  }

  return response;
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Default to 500 if no status code set
  const statusCode = err.statusCode || res.statusCode || 500;

  // Don't change status if already set
  if (res.statusCode === 200) {
    res.statusCode = statusCode;
  }

  // Set content type
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Format error response
  const isDevelopment = process.env.NODE_ENV !== "production";
  const response = formatErrorResponse(err, isDevelopment);

  // Send response
  res.end(JSON.stringify(response));
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      error: "Not found",
      path: req.url,
    })
  );
}

/**
 * Async error wrapper
 * Wraps async functions to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error with status code
 */
class HttpError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  HttpError,
};
