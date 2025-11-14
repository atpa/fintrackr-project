/**
 * Middleware exports
 * Centralized export of all middleware functions
 */

const { authMiddleware, optionalAuthMiddleware, isPublicEndpoint } = require("./auth");
const { requestLogger, errorLogger } = require("./logger");
const { errorHandler, notFoundHandler, asyncHandler, HttpError } = require("./errorHandler");
const { corsMiddleware } = require("./cors");
const { bodyParserMiddleware } = require("./bodyParser");

module.exports = {
  // Authentication
  authMiddleware,
  optionalAuthMiddleware,
  isPublicEndpoint,

  // Logging
  requestLogger,
  errorLogger,

  // Error handling
  errorHandler,
  notFoundHandler,
  asyncHandler,
  HttpError,

  // CORS
  corsMiddleware,

  // Body parsing
  bodyParserMiddleware,
};
