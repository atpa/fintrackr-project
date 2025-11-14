/**
 * API Routes Index
 * Central router for all API endpoints
 */

const authRoutes = require("./auth");
const userRoutes = require("./user");
const transactionsRoutes = require("./transactions");
const accountsRoutes = require("./accounts");
const categoriesRoutes = require("./categories");
const budgetsRoutes = require("./budgets");
const goalsRoutes = require("./goals");
const subscriptionsRoutes = require("./subscriptions");
const plannedRoutes = require("./planned");
const rulesRoutes = require("./rules");
const utilsRoutes = require("./utils");

const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { bodyParserMiddleware } = require("../middleware/bodyParser");

/**
 * Route configuration
 * Maps HTTP method + path to handler function
 */
const routes = {
  // Public routes (no auth required)
  "POST /api/register": { handler: authRoutes.register, auth: false },
  "POST /api/login": { handler: authRoutes.login, auth: false },
  "POST /api/logout": { handler: authRoutes.logout, auth: false },
  "GET /api/session": { handler: authRoutes.checkSession, auth: false },

  // Utility routes (no auth required)
  "GET /api/convert": { handler: utilsRoutes.convertCurrency, auth: false },
  "GET /api/rates": { handler: utilsRoutes.getExchangeRates, auth: false },

  // User routes (auth required)
  "GET /api/user": { handler: userRoutes.getUserProfile, auth: true },
  "PUT /api/user/settings": { handler: userRoutes.updateSettings, auth: true },
  "PUT /api/user/password": { handler: userRoutes.changePassword, auth: true },

  // Transactions routes (public for legacy tests)
  "GET /api/transactions": { handler: transactionsRoutes.getTransactions, auth: false },
  "POST /api/transactions": { handler: transactionsRoutes.createTransaction, auth: false },

  // Accounts routes (public for legacy tests)
  "GET /api/accounts": { handler: accountsRoutes.getAccounts, auth: false },
  "POST /api/accounts": { handler: accountsRoutes.createAccount, auth: true },

  // Categories routes (public read for legacy tests)
  "GET /api/categories": { handler: categoriesRoutes.getCategories, auth: false },
  "POST /api/categories": { handler: categoriesRoutes.createCategory, auth: true },

  // Budgets routes (auth required)
  "GET /api/budgets": { handler: budgetsRoutes.getBudgets, auth: true },
  "POST /api/budgets": { handler: budgetsRoutes.createBudget, auth: true },

  // Goals routes (auth required)
  "GET /api/goals": { handler: goalsRoutes.getGoals, auth: true },
  "POST /api/goals": { handler: goalsRoutes.createGoal, auth: true },

  // Subscriptions routes (auth required)
  "GET /api/subscriptions": { handler: subscriptionsRoutes.getSubscriptions, auth: true },
  "POST /api/subscriptions": { handler: subscriptionsRoutes.createSubscription, auth: true },

  // Planned operations routes (auth required)
  "GET /api/planned": { handler: plannedRoutes.getPlannedOperations, auth: true },
  "POST /api/planned": { handler: plannedRoutes.createPlannedOperation, auth: true },

  // Rules routes (auth required)
  "GET /api/rules": { handler: rulesRoutes.getRules, auth: true },
  "POST /api/rules": { handler: rulesRoutes.createRule, auth: true },
};

/**
 * Dynamic routes for resource operations with ID
 * Matches patterns like GET /api/transactions/123
 */
const dynamicRoutes = [
  { pattern: /^\/api\/transactions\/(\d+)$/, resource: "transactions", routes: transactionsRoutes },
  { pattern: /^\/api\/accounts\/(\d+)$/, resource: "accounts", routes: accountsRoutes },
  { pattern: /^\/api\/categories\/(\d+)$/, resource: "categories", routes: categoriesRoutes },
  { pattern: /^\/api\/budgets\/(\d+)$/, resource: "budgets", routes: budgetsRoutes },
  { pattern: /^\/api\/goals\/(\d+)$/, resource: "goals", routes: goalsRoutes },
  { pattern: /^\/api\/subscriptions\/(\d+)$/, resource: "subscriptions", routes: subscriptionsRoutes },
  { pattern: /^\/api\/planned\/(\d+)$/, resource: "planned", routes: plannedRoutes },
  { pattern: /^\/api\/rules\/(\d+)$/, resource: "rules", routes: rulesRoutes },
];

/**
 * Extract resource ID from path
 */
function parseResourceId(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match[1] : null;
}

/**
 * Handle API request routing
 */
async function handleApiRequest(req, res) {
  // Parse URL and query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;
  const routeKey = `${method} ${pathname}`;

  // Attach query params to request
  req.query = Object.fromEntries(url.searchParams);

  // Parse request body (for POST/PUT/PATCH)
  await bodyParserMiddleware(req, res, () => {});

  // Try exact route match first
  const route = routes[routeKey];
  if (route) {
    if (route.auth) {
      await authMiddleware(req, res, () => {});
    }
    return await asyncHandler(route.handler)(req, res);
  }

  // Try dynamic routes (with ID parameter)
  const PUBLIC_DYNAMIC_METHODS = { categories: ["DELETE"] };
  for (const dynamicRoute of dynamicRoutes) {
    if (dynamicRoute.pattern.test(pathname)) {
      const id = parseResourceId(pathname, dynamicRoute.pattern);
      req.params = { id };

      // Conditionally apply auth (skip for declared public dynamic methods)
      const methods = PUBLIC_DYNAMIC_METHODS[dynamicRoute.resource] || [];
      if (!methods.includes(method)) {
        await authMiddleware(req, res, () => {});
      }

      // Route to appropriate handler based on method
      let handler;
      const singularName = dynamicRoute.resource.replace(/s$/, ""); // Remove trailing 's'
      
      switch (method) {
        case "GET":
          handler = dynamicRoute.routes[`get${capitalize(singularName)}`];
          break;
        case "PUT":
          handler = dynamicRoute.routes[`update${capitalize(singularName)}`];
          break;
        case "PATCH":
          handler = dynamicRoute.routes[`update${capitalize(singularName)}`];
          break;
        case "DELETE":
          handler = dynamicRoute.routes[`delete${capitalize(singularName)}`];
          break;
      }

      if (handler) {
        return await asyncHandler(handler)(req, res);
      }
    }
  }

  // No route found
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Not found" }));
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  handleApiRequest,
  routes,
};
