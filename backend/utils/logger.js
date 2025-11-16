/**
 * Winston Logger Configuration
 * Provides structured logging with different levels and transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for console output (development)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * JSON format for file output (production)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Error log: only errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined log: all levels
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * Add console transport in development
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

/**
 * Helper methods for common logging patterns
 */

/**
 * Log HTTP request
 */
logger.logRequest = (method, url, statusCode, duration, userId = null) => {
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId
  });
};

/**
 * Log database query
 */
logger.logQuery = (operation, table, duration, rowCount = null) => {
  logger.debug('Database Query', {
    operation,
    table,
    duration: `${duration}ms`,
    rowCount
  });
};

/**
 * Log authentication event
 */
logger.logAuth = (event, userId, email, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication Event', {
    event,
    userId,
    email,
    success
  });
};

/**
 * Log error with context
 */
logger.logError = (message, error, context = {}) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...context
  });
};

module.exports = logger;
