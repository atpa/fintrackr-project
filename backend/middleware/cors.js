/**
 * CORS middleware
 * Handles Cross-Origin Resource Sharing
 */

/**
 * Default CORS options
 */
const defaultOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * CORS middleware
 */
function corsMiddleware(options = {}) {
  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", config.origin);
    res.setHeader("Access-Control-Allow-Methods", config.methods);
    res.setHeader("Access-Control-Allow-Headers", config.allowedHeaders);
    res.setHeader("Access-Control-Max-Age", config.maxAge.toString());

    if (config.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  };
}

module.exports = {
  corsMiddleware,
};
