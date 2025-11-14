/**
 * Body Parser Middleware
 * Parses request body for POST/PUT/PATCH requests
 */

const { HttpError } = require("./errorHandler");

/**
 * Parse JSON request body
 * Attaches parsed body to req.body
 */
async function bodyParserMiddleware(req, res, next) {
  // Only parse body for methods that typically have one
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    req.body = {};
    return;
  }

  return new Promise((resolve, reject) => {
    let body = "";
    
    req.on("data", (chunk) => {
      body += chunk.toString();
      
      // Prevent large payloads (10MB limit)
      if (body.length > 10 * 1024 * 1024) {
        req.removeAllListeners("data");
        req.removeAllListeners("end");
        reject(new HttpError("Payload too large", 413));
      }
    });

    req.on("end", () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        resolve();
      } catch (error) {
        reject(new HttpError("Invalid JSON", 400));
      }
    });

    req.on("error", (error) => {
      reject(new HttpError("Request error", 400));
    });
  });
}

module.exports = {
  bodyParserMiddleware,
};
