/**
 * Security Middleware
 * Implements rate limiting, CSRF protection, and security headers
 */

// Simple in-memory rate limiter
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 * Prevents brute force attacks by limiting requests per IP
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @returns {Function} Middleware function
 */
function rateLimit(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const maxRequests = options.maxRequests || 100; // 100 requests per window default
  
  return function rateLimitMiddleware(req, res, next) {
    const ip = req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit record for this IP
    if (!rateLimitStore.has(ip)) {
      rateLimitStore.set(ip, { count: 0, resetTime: now + windowMs });
    }
    
    const record = rateLimitStore.get(ip);
    
    // Reset if window has expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    // Increment request count
    record.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    
    // Check if limit exceeded
    if (record.count > maxRequests) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      res.end(JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }));
      return;
    }
    
    next();
  };
}

/**
 * Security headers middleware
 * Adds essential security headers to all responses
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  // Note: 'unsafe-inline' is needed for inline styles/scripts in current implementation
  // TODO: Remove 'unsafe-inline' and use nonces or hashes for better security
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.exchangerate.host https://*.exchangerate.host; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  next();
}

/**
 * CORS middleware
 * Configures Cross-Origin Resource Sharing
 */
function cors(options = {}) {
  const allowedOrigins = options.origins || ['http://localhost:3000'];
  const allowedMethods = options.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  const allowedHeaders = options.headers || ['Content-Type', 'Authorization'];
  const credentials = options.credentials !== false;
  
  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    
    next();
  };
}

/**
 * Input sanitization middleware
 * Cleans potentially dangerous input
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS attacks
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
          .replace(/javascript:/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * Request logging middleware
 * Logs all incoming requests (development only)
 */
function requestLogger(req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    const start = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Log response when finished
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
      originalEnd.apply(res, args);
    };
  }
  
  next();
}

/**
 * Cleanup old rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime + 3600000) { // Clean up after 1 hour of inactivity
      rateLimitStore.delete(ip);
    }
  }
}, 300000); // Run every 5 minutes

module.exports = {
  rateLimit,
  securityHeaders,
  cors,
  sanitizeInput,
  requestLogger
};
