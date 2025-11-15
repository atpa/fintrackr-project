/**
 * Error Handling Middleware
 * Centralized error handling with consistent response format
 */

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, { errors });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error response formatter
 * Creates consistent error response format
 */
function formatErrorResponse(error, includeStack = false) {
  const response = {
    error: error.message || 'Internal server error',
    status: error.statusCode || 500
  };
  
  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }
  
  // Add additional details for operational errors
  if (error.isOperational && error.details) {
    response.details = error.details;
  }
  
  // Include stack trace in development
  if (includeStack && process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }
  
  return response;
}

/**
 * Global error handler middleware
 * Catches all errors and sends appropriate response
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    });
  } else {
    // In production, log only essential info
    console.error('[Error]', err.message);
  }
  
  // Set status code
  const statusCode = err.statusCode || 500;
  res.statusCode = statusCode;
  
  // Set content type
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Format and send error response
  const errorResponse = formatErrorResponse(err, process.env.NODE_ENV !== 'production');
  res.end(JSON.stringify(errorResponse));
}

/**
 * Not found handler
 * Catches 404 errors for undefined routes
 */
function notFoundHandler(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    error: 'Not found',
    message: `Route ${req.method} ${req.url} not found`,
    status: 404
  }));
}

/**
 * Async handler wrapper
 * Wraps async functions to catch promise rejections
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation helper
 * Validates required fields in request body
 */
function validateRequired(data, requiredFields) {
  const errors = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`
      });
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

/**
 * Type validation helper
 */
function validateTypes(data, typeMap) {
  const errors = [];
  
  for (const [field, expectedType] of Object.entries(typeMap)) {
    if (data[field] !== undefined && typeof data[field] !== expectedType) {
      errors.push({
        field,
        message: `${field} must be of type ${expectedType}`
      });
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Type validation failed', errors);
  }
}

/**
 * Range validation helper
 */
function validateRange(value, min, max, fieldName = 'value') {
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      [{
        field: fieldName,
        message: `Must be between ${min} and ${max}`,
        min,
        max
      }]
    );
  }
}

/**
 * Email validation helper
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(
      'Invalid email format',
      [{
        field: 'email',
        message: 'Must be a valid email address'
      }]
    );
  }
}

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  
  // Middleware functions
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Validation helpers
  validateRequired,
  validateTypes,
  validateRange,
  validateEmail,
  
  // Utilities
  formatErrorResponse
};
