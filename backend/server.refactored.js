/**
 * РЕФАКТОРИНГ: Новая модульная версия сервера
 * 
 * Этот файл демонстрирует, как должен выглядеть server.js после полного рефакторинга.
 * Для миграции:
 * 1. Протестируйте текущую версию
 * 2. Постепенно переносите роуты из старого server.js
 * 3. Замените старый файл этим после полного покрытия тестами
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Configuration and services
const { ENV, MIME_TYPES } = require("./config/constants");
const { getData, persistData } = require("./services/dataService");
const { authenticateRequest } = require("./services/authService");
const { sendJson, sendError, parseUserId, isPublicApiRequest } = require("./utils/http");

// Import API handlers (to be created)
// const authRouter = require("./api/authRouter");
// const accountsRouter = require("./api/accountsRouter");
// const transactionsRouter = require("./api/transactionsRouter");
// ... etc

/**
 * Handle static file requests
 */
function handleStatic(req, res) {
  let filePath = url.parse(req.url).pathname;
  if (filePath === "/" || filePath === "/index.html") {
    filePath = "/landing.html";
  }

  const publicDir = path.join(__dirname, "..", "public");
  filePath = path.join(publicDir, filePath);

  // Security: prevent directory traversal
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(publicDir)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      return res.end("Not Found");
    }

    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    fs.createReadStream(filePath).pipe(res);
  });
}

/**
 * Handle API requests
 * This is a simplified router - real implementation would split into modules
 */
async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`[API] ${method} ${pathname}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id");

  if (method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // Authentication check
  let currentUser = null;
  if (!isPublicApiRequest(method, pathname)) {
    // Try X-User-Id header first (legacy)
    let userId = parseUserId(req.headers["x-user-id"]);
    if (!userId) {
      userId = parseUserId(parsedUrl.query.userId);
    }

    if (userId) {
      const data = getData();
      currentUser = data.users.find((u) => u.id === userId);
    }

    // Fallback to JWT authentication
    if (!currentUser) {
      const auth = authenticateRequest(req);
      if (auth && auth.ok) {
        currentUser = auth.user;
      }
    }

    if (!currentUser) {
      return sendError(res, "Unauthorized", 401);
    }
  }

  // Route to appropriate handler
  // In full refactor, this would delegate to separate router modules
  try {
    // Example: authRouter.handle(req, res, pathname, method)
    // Example: accountsRouter.handle(req, res, pathname, method, currentUser)
    
    // For now, return not implemented
    sendError(res, "Route handler not yet migrated", 501);
  } catch (err) {
    console.error("[API Error]", err);
    sendError(res, err.message || "Internal Server Error", 500);
  }
}

/**
 * Create HTTP server
 */
function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      return handleApi(req, res);
    }
    if (req.method !== "GET") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }
    return handleStatic(req, res);
  });
}

// Start server if run directly
if (require.main === module) {
  const server = createServer();
  const PORT = ENV.PORT;
  
  server.listen(PORT, () => {
    console.log(`FinTrackr server (refactored) listening on http://localhost:${PORT}`);
  });
}

module.exports = {
  createServer,
  handleApi,
  handleStatic,
};
