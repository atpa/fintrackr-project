/**
 * FinTrackr Server
 * 
 * NOTE: This file is currently monolithic (~2000 lines) and needs refactoring.
 * Modular services have been created in:
 * - config/constants.js - Application constants
 * - services/authService.js - Authentication and JWT
 * - services/dataService.js - Data persistence
 * - services/currencyService.js - Currency conversion
 * - utils/http.js - HTTP utilities
 * 
 * See server.refactored.js for the target architecture.
 * Migration in progress - use services where imported below.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Note: Modular services created but not yet fully integrated
// Keeping original implementation for stability
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const dataPath = path.join(__dirname, "data.json");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";
if (JWT_SECRET === "dev-secret-change" && process.env.NODE_ENV === "production") {
  console.error("SECURITY WARNING: Using default JWT_SECRET in production! Set JWT_SECRET environment variable.");
  process.exit(1);
}
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const BANKS = [
  { id: 1, name: "Тинькофф" },
  { id: 2, name: "Сбербанк" },
  { id: 3, name: "Альфа-Банк" },
  { id: 4, name: "ВТБ" },
];

const MOCK_BANK_TRANSACTIONS = {
  1: [
    {
      external_id: "tnk_grocery_001",
      description: "Перекрёсток, Москва",
      type: "expense",
      amount: 2350.4,
      currency: "RUB",
      date: "2025-03-12",
      category: { name: "Продукты", kind: "expense" },
    },
    {
      external_id: "tnk_taxi_001",
      description: "Яндекс Такси",
      type: "expense",
      amount: 680.3,
      currency: "RUB",
      date: "2025-03-14",
      category: { name: "Транспорт", kind: "expense" },
    },
    {
      external_id: "tnk_salary_001",
      description: "Зарплата ООО \"Финтех\"",
      type: "income",
      amount: 180000,
      currency: "RUB",
      date: "2025-03-10",
      category: { name: "Зарплата", kind: "income" },
    },
  ],
  2: [
    {
      external_id: "sbr_coffee_001",
      description: "Кофейня DoubleB",
      type: "expense",
      amount: 18.5,
      currency: "EUR",
      date: "2025-03-11",
      category: { name: "Развлечения", kind: "expense" },
    },
    {
      external_id: "sbr_gas_001",
      description: "АЗС Лукойл",
      type: "expense",
      amount: 3200,
      currency: "RUB",
      date: "2025-03-09",
      category: { name: "Транспорт", kind: "expense" },
    },
    {
      external_id: "sbr_interest_001",
      description: "Проценты по вкладу",
      type: "income",
      amount: 52.75,
      currency: "EUR",
      date: "2025-03-08",
      category: { name: "Зарплата", kind: "income" },
    },
  ],
  3: [
    {
      external_id: "alf_market_001",
      description: "Продуктовый рынок",
      type: "expense",
      amount: 94.2,
      currency: "USD",
      date: "2025-02-27",
      category: { name: "Продукты", kind: "expense" },
    },
    {
      external_id: "alf_entertainment_001",
      description: "Кинотеатр \"Октябрь\"",
      type: "expense",
      amount: 1450,
      currency: "RUB",
      date: "2025-03-01",
      category: { name: "Развлечения", kind: "expense" },
    },
    {
      external_id: "alf_bonus_001",
      description: "Бонусы кэшбэк",
      type: "income",
      amount: 25.6,
      currency: "USD",
      date: "2025-03-05",
      category: { name: "Зарплата", kind: "income" },
    },
  ],
  4: [
    {
      external_id: "vtb_gift_001",
      description: "Подарок коллеге",
      type: "expense",
      amount: 4100,
      currency: "RUB",
      date: "2025-03-02",
      category: { name: "Подарки", kind: "expense" },
    },
    {
      external_id: "vtb_grocery_001",
      description: "Пятёрочка",
      type: "expense",
      amount: 2750.8,
      currency: "RUB",
      date: "2025-03-03",
      category: { name: "Продукты", kind: "expense" },
    },
    {
      external_id: "vtb_salary_001",
      description: "Аванс",
      type: "income",
      amount: 62000,
      currency: "RUB",
      date: "2025-03-15",
      category: { name: "Зарплата", kind: "income" },
    },
  ],
};

/**
 * Apply default structure to data object
 */
function applyDataDefaults(target) {
  if (!target.users) target.users = [];
  if (!target.accounts) target.accounts = [];
  if (!target.categories) target.categories = [];
  if (!target.transactions) target.transactions = [];
  if (!target.budgets) target.budgets = [];
  if (!target.goals) target.goals = [];
  if (!target.planned) target.planned = [];
  if (!target.subscriptions) target.subscriptions = [];
  if (!target.rules) target.rules = [];
  if (!target.recurring) target.recurring = [];
  if (!target.refreshTokens) target.refreshTokens = [];
  if (!target.tokenBlacklist) target.tokenBlacklist = [];
  if (!target.bankConnections) target.bankConnections = [];
  return target;
}

/**
 * Load data from JSON file
 */
function loadData() {
  try {
    if (!fs.existsSync(dataPath)) {
      return applyDataDefaults({});
    }
    const raw = fs.readFileSync(dataPath, "utf-8");
    const parsed = JSON.parse(raw);
    return applyDataDefaults(parsed);
  } catch (err) {
    // SECURITY: Log full error internally, but don't expose to clients
    console.error("Failed to load data file:", err.message, err.code || "");
    return applyDataDefaults({});
  }
}

let data = loadData();
const defaultUserId =
  data.users && data.users.length > 0 ? data.users[0].id : null;

// Ensure collections have user IDs
function ensureCollectionUserId(collection, fallbackUserId = null) {
  if (!Array.isArray(collection)) return;
  collection.forEach((item) => {
    if (item && typeof item === "object" && item.user_id == null) {
      item.user_id = fallbackUserId;
    }
  });
}

ensureCollectionUserId(data.accounts, defaultUserId);
ensureCollectionUserId(data.categories, defaultUserId);
ensureCollectionUserId(data.transactions, defaultUserId);
ensureCollectionUserId(data.budgets, defaultUserId);
ensureCollectionUserId(data.goals, defaultUserId);
ensureCollectionUserId(data.planned, defaultUserId);
ensureCollectionUserId(data.bankConnections, defaultUserId);
ensureCollectionUserId(data.subscriptions, defaultUserId);
ensureCollectionUserId(data.rules, defaultUserId);

/**
 * Сохраняет текущее состояние `data` в файл. Если происходит ошибка, выводит её в консоль.
 */
function persistData() {
  if (process.env.FINTRACKR_DISABLE_PERSIST === "true") {
    return;
  }
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    // SECURITY: Log error details server-side only
    console.error("Failed to write data file:", err.message, err.code || "");
  }
}

function getData() {
  return data;
}

function setData(nextData) {
  data = applyDataDefaults(nextData);
}

/**
 * Возвращает текст ответа в JSON с правильными заголовками
 */
function sendJson(res, obj, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, password_salt, ...rest } = user;
  return rest;
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(/;\s*/).reduce((acc, part) => {
    const [key, ...v] = part.split("=");
    if (!key) return acc;
    acc[decodeURIComponent(key)] = decodeURIComponent(v.join("="));
    return acc;
  }, {});
}

function buildCookie(name, value, options = {}) {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; Path=${options.path || "/"}`;
  if (options.httpOnly !== false) cookie += "; HttpOnly";
  if (options.maxAge != null) cookie += `; Max-Age=${options.maxAge}`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.secure) cookie += "; Secure";
  return cookie;
}

function setAuthCookies(res, tokens, options = {}) {
  const sameSite = options.sameSite || "Lax";
  const secure =
    options.secure !== undefined ? options.secure : COOKIE_SECURE;
  const cookies = [
    buildCookie("access_token", tokens.accessToken, {
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
      sameSite,
      secure,
    }),
    buildCookie("refresh_token", tokens.refreshToken, {
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      sameSite,
      secure,
    }),
  ];
  res.setHeader("Set-Cookie", cookies);
}

function clearAuthCookies(res, options = {}) {
  const sameSite = options.sameSite || "Lax";
  const secure =
    options.secure !== undefined ? options.secure : COOKIE_SECURE;
  const cookies = [
    buildCookie("access_token", "", { maxAge: 0, sameSite, secure }),
    buildCookie("refresh_token", "", { maxAge: 0, sameSite, secure }),
  ];
  res.setHeader("Set-Cookie", cookies);
}

function cleanupTokenStores() {
  const now = Date.now();
  const refreshBefore = data.refreshTokens.length;
  data.refreshTokens = data.refreshTokens.filter((entry) => {
    return entry && entry.expiresAt && entry.expiresAt > now;
  });
  const blacklistBefore = data.tokenBlacklist.length;
  data.tokenBlacklist = data.tokenBlacklist.filter((entry) => {
    return entry && entry.expiresAt && entry.expiresAt > now;
  });
  if (
    refreshBefore !== data.refreshTokens.length ||
    blacklistBefore !== data.tokenBlacklist.length
  ) {
    persistData();
  }
}

function isTokenBlacklisted(token) {
  return data.tokenBlacklist.some((entry) => entry.token === token);
}

function addTokenToBlacklist(token, expiresAt) {
  if (!token) return;
  const expMs = expiresAt ? expiresAt : Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
  data.tokenBlacklist.push({ token, expiresAt: expMs });
  persistData();
}

function issueTokensForUser(user) {
  cleanupTokenStores();
  const jwtId = crypto.randomBytes(16).toString("hex");
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS, jwtid: jwtId }
  );
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshExpiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;
  data.refreshTokens.push({
    token: refreshToken,
    userId: user.id,
    expiresAt: refreshExpiresAt,
  });
  persistData();
  return {
    accessToken,
    refreshToken,
    jwtId,
    refreshExpiresAt,
    accessExpiresAt: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
}

function consumeRefreshToken(token) {
  if (!token) return null;
  cleanupTokenStores();
  const idx = data.refreshTokens.findIndex((entry) => entry.token === token);
  if (idx === -1) return null;
  const entry = data.refreshTokens[idx];
  if (!entry || entry.expiresAt < Date.now()) {
    data.refreshTokens.splice(idx, 1);
    persistData();
    return null;
  }
  data.refreshTokens.splice(idx, 1);
  persistData();
  const user = data.users.find((u) => u.id === entry.userId);
  if (!user) {
    return null;
  }
  return { user, entry };
}

function authenticateRequest(req) {
  try {
    cleanupTokenStores();
    const cookies = parseCookies(req);
    let token = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (cookies.access_token) {
      token = cookies.access_token;
    }
    if (!token) {
      return {
        ok: false,
        statusCode: 401,
        error: "Missing access token",
      };
    }
    if (isTokenBlacklisted(token)) {
      return {
        ok: false,
        statusCode: 401,
        error: "Token revoked",
      };
    }
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return {
        ok: false,
        statusCode: 401,
        error: "Invalid or expired token",
      };
    }
    const user = data.users.find((u) => u.id === payload.sub);
    if (!user) {
      return {
        ok: false,
        statusCode: 401,
        error: "User not found",
      };
    }
    return { ok: true, user, token, payload };
    } catch (err) {
    // SECURITY: Log error details server-side, return generic message to client
    console.error("Token verification error:", err.message);
    return {
      ok: false,
      statusCode: 500,
      error: "Authentication error",
    };
  }
}

function requireAuth(req, res) {
  const auth = authenticateRequest(req);
  if (!auth.ok) {
    sendJson(res, { error: auth.error }, auth.statusCode);
    return null;
  }
  return auth;
}

// Простой серверный конвертер валют для согласованности с клиентом
const RATE_MAP = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 },
};

const ALLOWED_CURRENCIES = ["USD", "EUR", "PLN", "RUB"];

function getNextId(arr) {
  return arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

function parseUserId(raw) {
  if (raw == null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function isPublicApiRequest(method, pathname) {
  if (method === "POST" && (pathname === "/api/login" || pathname === "/api/register")) {
    return true;
  }
  if (method === "GET" && ["/api/convert", "/api/banks", "/api/rates"].includes(pathname)) {
    return true;
  }
  return false;
}

function getBudgetMonth(dateStr) {
  if (!dateStr) return null;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function resolveBudgetForExpense(dataObj, tx, userId, createIfMissing = false) {
  if (!tx || tx.type !== "expense") return null;
  const month = getBudgetMonth(tx.date);
  if (!month) return null;
  let budget = dataObj.budgets.find(
    (b) => b.user_id === userId && b.category_id === tx.category_id && b.month === month
  );
  if (!budget && createIfMissing) {
    budget = {
      id: getNextId(dataObj.budgets),
      user_id: userId,
      category_id: tx.category_id,
      month,
      limit: 0,
      spent: 0,
      type: "fixed",
      percent: null,
      currency: tx.currency || "USD",
    };
    dataObj.budgets.push(budget);
  }
  return budget;
}

function adjustBudgetWithTransaction(budget, tx, direction = 1) {
  if (!budget || !tx || tx.type !== "expense") return;
  const bCur = budget.currency || "USD";
  const delta = convertAmount(Number(tx.amount), tx.currency || "USD", bCur);
  const nextValue = Number(budget.spent) + direction * Number(delta);
  budget.spent = Math.max(0, Number.isFinite(nextValue) ? nextValue : Number(budget.spent) || 0);
}

function convertAmount(amount, from, to) {
  if (!from || !to || from === to) return Number(amount) || 0;
  const rates = RATE_MAP[from];
  if (rates && rates[to]) return Number(amount) * rates[to];
  return Number(amount) || 0;
}

/**
 * Обработка запроса к API: отдаёт данные из объекта `data`
 */
function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  cleanupTokenStores();

  // Быстрые обработчики аутентификации (регистрация/вход/выход) до остальных маршрутов
  if (req.method === "POST" && url.pathname === "/api/register") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch (err) {
        return sendJson(res, { error: "Invalid JSON" }, 400);
      }
      const { name, email, password } = payload || {};
      if (!name || !email || !password) {
        return sendJson(res, { error: "Missing registration parameters" }, 400);
      }
      const exists = data.users.find((u) => u.email && u.email.toLowerCase() === String(email).toLowerCase());
      if (exists) {
        return sendJson(res, { error: "User already exists" }, 400);
      }
      const saltRounds = 10;
      let password_hash;
      try {
        password_hash = await bcrypt.hash(password, saltRounds);
      } catch (e) {
        return sendJson(res, { error: "Unable to hash password" }, 500);
      }
      const user = {
        id: getNextId(data.users),
        name: String(name),
        email: String(email),
        password_hash,
      };
      data.users.push(user);
      persistData();
      const tokens = issueTokensForUser(user);
      setAuthCookies(res, tokens);
      return sendJson(res, { user: sanitizeUser(user) }, 201);
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch (err) {
        return sendJson(res, { error: "Invalid JSON" }, 400);
      }
      const { email, password } = payload || {};
      if (!email || !password) {
        return sendJson(res, { error: "Missing login parameters" }, 400);
      }
      const user = data.users.find((u) => u.email && u.email.toLowerCase() === String(email).toLowerCase());
      if (!user) return sendJson(res, { error: "Invalid email or password" }, 401);
      let ok = false;
      if (user.password_hash) {
        try {
          ok = await bcrypt.compare(password, user.password_hash);
        } catch (e) {
          ok = false;
        }
        if (!ok) {
          // Фоллбэк: поддержка старых sha256-хэшей
          const sha = crypto.createHash("sha256").update(password).digest("hex");
          if (user.password_hash === sha) {
            ok = true;
            try {
              user.password_hash = await bcrypt.hash(password, 10);
              persistData();
            } catch (e) {}
          }
        }
      }
      if (!ok) return sendJson(res, { error: "Invalid email or password" }, 401);
      const tokens = issueTokensForUser(user);
      setAuthCookies(res, tokens);
      return sendJson(res, { user: sanitizeUser(user) }, 200);
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    const cookies = parseCookies(req);
    const access = cookies.access_token;
    const refresh = cookies.refresh_token;
    if (access) {
      // Помечаем access токен как отозванный
      addTokenToBlacklist(access);
    }
    if (refresh) {
      // Уничтожаем refresh токен
      consumeRefreshToken(refresh);
    }
    clearAuthCookies(res);
    return sendJson(res, { success: true });
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const auth = authenticateRequest(req);
    if (auth.ok) {
      return sendJson(res, { user: sanitizeUser(auth.user) });
    }
    if (auth.statusCode === 500) {
      return sendJson(res, { error: auth.error }, 500);
    }
    const cookies = parseCookies(req);
    const refreshToken = cookies.refresh_token;
    if (refreshToken) {
      const refreshData = consumeRefreshToken(refreshToken);
      if (refreshData && refreshData.user) {
        const tokens = issueTokensForUser(refreshData.user);
        setAuthCookies(res, tokens);
        return sendJson(res, { user: sanitizeUser(refreshData.user) });
      }
    }
    clearAuthCookies(res);
    return sendJson(res, { error: "Not authenticated" }, 401);
  }

  // SECURITY FIX: Removed X-User-Id header fallback (critical vulnerability)
  // All authentication now goes through JWT tokens only
  const authRequired = !isPublicApiRequest(req.method, url.pathname);
  let currentUser = null;
  let currentUserId = null;
  
  if (authRequired) {
    const auth = authenticateRequest(req);
    if (!auth || !auth.ok) {
      return sendJson(res, { error: auth?.error || "Unauthorized" }, auth?.statusCode || 401);
    }
    currentUser = auth.user;
    currentUserId = auth.user.id;
  }
  const userId = currentUser ? currentUser.id : null;
  const filterForUser = (collection) => {
    if (!Array.isArray(collection) || !userId) return [];
    return collection.filter((item) => item.user_id === userId);
  };
  const findForUser = (collection, id) => {
    if (!userId) return null;
    return collection.find((item) => item.id === id && item.user_id === userId);
  };

  // Обработка DELETE‑запросов для API (удаление сущностей)
  if (req.method === "DELETE") {
    const auth = requireAuth(req, res);
    if (!auth) return;
    // Удаление категории: /api/categories/:id
    const catMatch = url.pathname.match(/^\/api\/categories\/(\d+)$/);
    if (catMatch) {
      const catId = Number(catMatch[1]);
      const index = data.categories.findIndex(
        (c) => c.id === catId && c.user_id === userId
      );
      if (index === -1) {
        return sendJson(res, { error: "Category not found" }, 404);
      }
      // Удаляем категорию
      data.categories.splice(index, 1);
      // Также удаляем связанные бюджеты и плановые операции по этой категории
      data.budgets = data.budgets.filter(
        (b) => b.category_id !== catId || b.user_id !== userId
      );
      data.planned = data.planned.filter(
        (p) => p.category_id !== catId || p.user_id !== userId
      );
      // Очищаем ссылку на категорию в транзакциях
      data.transactions.forEach((tx) => {
        if (tx.user_id === userId && tx.category_id === catId) tx.category_id = null;
      });
      persistData();
      return sendJson(res, { success: true }, 200);
    }
    // Удаление подписки: /api/subscriptions/:id
    const subMatch = url.pathname.match(/^\/api\/subscriptions\/(\d+)$/);
    if (subMatch) {
      const subId = Number(subMatch[1]);
      const idx = data.subscriptions.findIndex(
        (s) => s.id === subId && s.user_id === userId
      );
      if (idx === -1) {
        return sendJson(res, { error: "Subscription not found" }, 404);
      }
      data.subscriptions.splice(idx, 1);
      persistData();
      return sendJson(res, { success: true }, 200);
    }

    // Удаление правила категоризации: /api/rules/:id
    const ruleMatch = url.pathname.match(/^\/api\/rules\/(\d+)$/);
    if (ruleMatch) {
      const ruleId = Number(ruleMatch[1]);
      const rIndex = data.rules.findIndex(
        (r) => r.id === ruleId && r.user_id === userId
      );
      if (rIndex === -1) {
        return sendJson(res, { error: "Rule not found" }, 404);
      }
      data.rules.splice(rIndex, 1);
      persistData();
      return sendJson(res, { success: true }, 200);
    }
    // Удаление транзакции: /api/transactions/:id (с обратной корректировкой баланса и бюджета)
    const txMatch = url.pathname.match(/^\/api\/transactions\/(\d+)$/);
    if (txMatch) {
      const txId = Number(txMatch[1]);
      const idx = data.transactions.findIndex(
        (t) => t.id === txId && t.user_id === userId
      );
      if (idx === -1) return sendJson(res, { error: "Transaction not found" }, 404);
      const tx = data.transactions[idx];
      // Откат баланса счёта с учётом валюты счёта
      const acc = data.accounts.find(
        (a) => a.id === tx.account_id && a.user_id === userId
      );
      if (acc) {
        const adj = convertAmount(Number(tx.amount), tx.currency || acc.currency || "USD", acc.currency || "USD");
        if (tx.type === "income") acc.balance = Number(acc.balance) - adj;
        else acc.balance = Number(acc.balance) + adj;
      }
      // Откат бюджета (если расход)
      if (tx.type === "expense") {
        const dt = new Date(tx.date);
        const month = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
        const b = data.budgets.find(
          (b) =>
            b.user_id === userId &&
            b.category_id === tx.category_id &&
            b.month === month
        );
        adjustBudgetWithTransaction(b, tx, -1);
      }
      data.transactions.splice(idx, 1);
      persistData();
      return sendJson(res, { success: true }, 200);
    }

    // Фолбэк для неподдерживаемых DELETE
    return sendJson(res, { error: "Not found" }, 404);
  }
  // Обработка PUT/PATCH‑запросов: частичное/полное обновление сущностей (без сложных пересчётов)
  if (req.method === "PUT" || req.method === "PATCH") {
    const auth = requireAuth(req, res);
    if (!auth) return;
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch (err) {
        return sendJson(res, { error: "Invalid JSON" }, 400);
      }
      // accounts update
      let m;
      m = url.pathname.match(/^\/api\/accounts\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const acc = findForUser(data.accounts, id);
        if (!acc) return sendJson(res, { error: "Account not found" }, 404);
        if (payload.name != null) acc.name = String(payload.name);
        if (payload.currency != null) {
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          acc.currency = String(payload.currency);
        }
        if (payload.balance != null) {
          const b = Number(payload.balance);
          if (!isFinite(b)) return sendJson(res, { error: "Invalid balance" }, 400);
          acc.balance = b;
        }
        persistData();
        return sendJson(res, acc, 200);
      }
      // categories update
      m = url.pathname.match(/^\/api\/categories\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const cat = findForUser(data.categories, id);
        if (!cat) return sendJson(res, { error: "Category not found" }, 404);
        if (payload.name != null) cat.name = String(payload.name);
        if (payload.kind != null) {
          if (!["income", "expense"].includes(String(payload.kind))) {
            return sendJson(res, { error: "Invalid category kind" }, 400);
          }
          cat.kind = String(payload.kind);
        }
        persistData();
        return sendJson(res, cat, 200);
      }
      // transactions update
      m = url.pathname.match(/^\/api\/transactions\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const tx = data.transactions.find((t) => t.id === id);
        if (!tx) return sendJson(res, { error: "Transaction not found" }, 404);
        const allowedCur = ["USD", "EUR", "PLN", "RUB"];
        const nextAccountId =
          payload.account_id != null ? Number(payload.account_id) : tx.account_id;
        const nextCategoryId =
          payload.category_id != null ? Number(payload.category_id) : tx.category_id;
        const nextType = payload.type != null ? String(payload.type) : tx.type;
        const nextAmount =
          payload.amount != null ? Number(payload.amount) : Number(tx.amount);
        const nextCurrency =
          payload.currency != null ? String(payload.currency) : tx.currency || "USD";
        const nextDate = payload.date != null ? payload.date : tx.date;
        const nextNote = payload.note != null ? String(payload.note) : tx.note || "";

        if (!nextAccountId || !nextCategoryId || !nextDate) {
          return sendJson(res, { error: "Missing transaction parameters" }, 400);
        }
        if (!isFinite(nextAmount) || nextAmount < 0) {
          return sendJson(res, { error: "Invalid amount" }, 400);
        }
        if (!["income", "expense"].includes(nextType)) {
          return sendJson(res, { error: "Invalid transaction type" }, 400);
        }
        if (!allowedCur.includes(nextCurrency)) {
          return sendJson(res, { error: "Invalid currency" }, 400);
        }
        const nextAccount = data.accounts.find((a) => a.id === nextAccountId);
        if (!nextAccount) {
          return sendJson(res, { error: "Account not found" }, 404);
        }
        const nextCategory = data.categories.find((c) => c.id === nextCategoryId);
        if (!nextCategory) {
          return sendJson(res, { error: "Category not found" }, 404);
        }
        if (
          (nextCategory.kind === "income" && nextType !== "income") ||
          (nextCategory.kind === "expense" && nextType !== "expense")
        ) {
          return sendJson(res, { error: "Transaction type does not match category kind" }, 400);
        }

        // Откатываем влияние старой операции
        const prevAccount = data.accounts.find((a) => a.id === tx.account_id);
        if (prevAccount) {
          const prevAdj = convertAmount(
            Number(tx.amount),
            tx.currency || prevAccount.currency || "USD",
            prevAccount.currency || "USD"
          );
          if (tx.type === "income") {
            prevAccount.balance = Number(prevAccount.balance) - prevAdj;
          } else {
            prevAccount.balance = Number(prevAccount.balance) + prevAdj;
          }
        }
        if (tx.type === "expense") {
          const prevDate = new Date(tx.date);
          const prevMonth =
            prevDate.getFullYear() + "-" + String(prevDate.getMonth() + 1).padStart(2, "0");
          const prevBudget = data.budgets.find(
            (b) => b.category_id === tx.category_id && b.month === prevMonth
          );
          if (prevBudget) {
            const prevCur = prevBudget.currency || "USD";
            const prevDec = convertAmount(Number(tx.amount), tx.currency || "USD", prevCur);
            prevBudget.spent = Math.max(0, Number(prevBudget.spent) - Number(prevDec));
          }
        }

        // Обновляем операцию новыми данными
        tx.account_id = nextAccountId;
        tx.category_id = nextCategoryId;
        tx.type = nextType;
        tx.amount = nextAmount;
        tx.currency = nextCurrency;
        tx.date = nextDate;
        tx.note = nextNote;

        // Применяем влияние обновлённой операции
        const newAccount = data.accounts.find((a) => a.id === tx.account_id);
        if (newAccount) {
          const newAdj = convertAmount(
            Number(tx.amount),
            tx.currency || newAccount.currency || "USD",
            newAccount.currency || "USD"
          );
          if (tx.type === "income") {
            newAccount.balance = Number(newAccount.balance) + newAdj;
          } else {
            newAccount.balance = Number(newAccount.balance) - newAdj;
          }
        }
        if (tx.type === "expense") {
          const nextDt = new Date(tx.date);
          const nextMonth =
            nextDt.getFullYear() + "-" + String(nextDt.getMonth() + 1).padStart(2, "0");
          let budget = data.budgets.find(
            (b) => b.category_id === tx.category_id && b.month === nextMonth
          );
          if (!budget) {
            const newBudgetId =
              data.budgets.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
            budget = {
              id: newBudgetId,
              category_id: tx.category_id,
              month: nextMonth,
              limit: 0,
              spent: 0,
              currency: "USD",
            };
            data.budgets.push(budget);
          }
          const budgetCur = budget.currency || "USD";
          const inc = convertAmount(Number(tx.amount), tx.currency || "USD", budgetCur);
          budget.spent = Number(budget.spent) + Number(inc);
        }

        persistData();
        return sendJson(res, tx, 200);
      }
      // budgets update
      m = url.pathname.match(/^\/api\/budgets\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const budget = findForUser(data.budgets, id);
        if (!budget) return sendJson(res, { error: "Budget not found" }, 404);
        if (payload.limit != null) {
          const l = Number(payload.limit);
          if (!isFinite(l) || l < 0) return sendJson(res, { error: "Invalid limit" }, 400);
          budget.limit = l;
        }
        if (payload.type != null) {
          if (!["fixed", "percent"].includes(String(payload.type))) {
            return sendJson(res, { error: "Invalid budget type" }, 400);
          }
          budget.type = String(payload.type);
        }
        if (payload.percent != null) {
          const p = Number(payload.percent);
          if (!isFinite(p) || p < 0 || p > 100) {
            return sendJson(res, { error: "Invalid percent" }, 400);
          }
          budget.percent = p;
        }
        if (payload.currency != null) {
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          budget.currency = String(payload.currency);
        }
        // spent/month/category_id не меняем здесь
        persistData();
        return sendJson(res, budget, 200);
      }
      // goals update
      m = url.pathname.match(/^\/api\/goals\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const goal = findForUser(data.goals, id);
        if (!goal) return sendJson(res, { error: "Goal not found" }, 404);
        if (payload.title != null) goal.title = String(payload.title);
        if (payload.target_amount != null) {
          const t = Number(payload.target_amount);
          if (!isFinite(t) || t < 0) return sendJson(res, { error: "Invalid target_amount" }, 400);
          goal.target_amount = t;
        }
        if (payload.current_amount != null) {
          const c = Number(payload.current_amount);
          if (!isFinite(c) || c < 0) return sendJson(res, { error: "Invalid current_amount" }, 400);
          goal.current_amount = c;
        }
        if (payload.deadline != null) goal.deadline = payload.deadline || null;
        persistData();
        return sendJson(res, goal, 200);
      }
      // planned update
      m = url.pathname.match(/^\/api\/planned\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const plan = findForUser(data.planned, id);
        if (!plan) return sendJson(res, { error: "Planned not found" }, 404);
        if (payload.account_id != null) {
          const newAccount = findForUser(
            data.accounts,
            Number(payload.account_id)
          );
          if (!newAccount) {
            return sendJson(res, { error: "Account not found" }, 404);
          }
          plan.account_id = newAccount.id;
        }
        let nextType = plan.type;
        if (payload.type != null) {
          if (!["income", "expense"].includes(String(payload.type))) {
            return sendJson(res, { error: "Invalid type" }, 400);
          }
          nextType = String(payload.type);
          plan.type = nextType;
        }
        if (payload.category_id != null) {
          const newCategory = findForUser(
            data.categories,
            Number(payload.category_id)
          );
          if (!newCategory) {
            return sendJson(res, { error: "Category not found" }, 404);
          }
          if (
            (newCategory.kind === "income" && nextType !== "income") ||
            (newCategory.kind === "expense" && nextType !== "expense")
          ) {
            return sendJson(res, { error: "Type does not match category" }, 400);
          }
          plan.category_id = newCategory.id;
        } else {
          const currentCategory = findForUser(
            data.categories,
            plan.category_id
          );
          if (
            currentCategory &&
            ((currentCategory.kind === "income" && nextType !== "income") ||
              (currentCategory.kind === "expense" && nextType !== "expense"))
          ) {
            return sendJson(res, { error: "Type does not match category" }, 400);
          }
        }
        if (payload.amount != null) {
          const a = Number(payload.amount);
          if (!isFinite(a) || a < 0) return sendJson(res, { error: "Invalid amount" }, 400);
          plan.amount = a;
        }
        if (payload.currency != null) {
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          plan.currency = String(payload.currency);
        }
        if (payload.start_date != null) plan.start_date = payload.start_date || null;
        if (payload.frequency != null) plan.frequency = String(payload.frequency);
        if (payload.note != null) plan.note = String(payload.note);
        persistData();
        return sendJson(res, plan, 200);
      }
      // subscriptions update
      m = url.pathname.match(/^\/api\/subscriptions\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const sub = findForUser(data.subscriptions, id);
        if (!sub) return sendJson(res, { error: "Subscription not found" }, 404);
        const allowedFreq = ["weekly", "monthly", "yearly"];
        if (payload.title != null) sub.title = String(payload.title);
        if (payload.amount != null) {
          const a = Number(payload.amount);
          if (!isFinite(a) || a < 0) return sendJson(res, { error: "Invalid amount" }, 400);
          sub.amount = a;
        }
        if (payload.currency != null) {
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          sub.currency = String(payload.currency);
        }
        if (payload.frequency != null) {
          if (!allowedFreq.includes(String(payload.frequency))) {
            return sendJson(res, { error: "Invalid frequency" }, 400);
          }
          sub.frequency = String(payload.frequency);
        }
        if (payload.next_date !== undefined) sub.next_date = payload.next_date || null;
        persistData();
        return sendJson(res, sub, 200);
      }
      // rules update
      m = url.pathname.match(/^\/api\/rules\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const rule = findForUser(data.rules, id);
        if (!rule) return sendJson(res, { error: "Rule not found" }, 404);
        if (payload.keyword != null) rule.keyword = String(payload.keyword).toLowerCase();
        if (payload.category_id != null) {
          const ruleCategory = findForUser(
            data.categories,
            Number(payload.category_id)
          );
          if (!ruleCategory) {
            return sendJson(res, { error: "Category not found" }, 404);
          }
          rule.category_id = ruleCategory.id;
        }
        persistData();
        return sendJson(res, rule, 200);
      }
      return sendJson(res, { error: "Not found" }, 404);
    });
    return;
  }
  // Обработка GET‑запросов
  if (req.method === "GET") {
    // Check if auth is required for this endpoint
    const isPublic = isPublicApiRequest(req.method, url.pathname);
    let auth = null;
    
    if (!isPublic) {
      auth = requireAuth(req, res);
      if (!auth) return;
    }
    
    // Специальные маршруты, обрабатываем до основного переключателя
    // Конвертация валют. Использует внешний сервис exchangerate.host, при недоступности
    // возвращает значения на основе фиксированных курсов как fallback.
    if (url.pathname === "/api/convert") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const amount = parseFloat(url.searchParams.get("amount") || "0");
      if (!from || !to || isNaN(amount)) {
        return sendJson(res, { error: "Missing parameters" }, 400);
      }
      // Фиксированные курсы для случая недоступности сервиса
      const fallbackRates = {
        USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
        EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
        PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
        RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 },
      };
      const queryUrl = `https://api.exchangerate.host/latest?base=${encodeURIComponent(
        from
      )}&symbols=${encodeURIComponent(to)}`;
      https
        .get(queryUrl, (apiRes) => {
          let raw = "";
          apiRes.on("data", (chunk) => (raw += chunk));
          apiRes.on("end", () => {
            try {
              const parsed = JSON.parse(raw);
              const rate =
                parsed && parsed.rates && parsed.rates[to]
                  ? parsed.rates[to]
                  : null;
              if (rate) {
                const result = Number(amount) * rate;
                return sendJson(res, {
                  from,
                  to,
                  amount,
                  rate,
                  result: +result.toFixed(4),
                });
              }
            } catch (e) {
              // ignore parse errors and fall back
            }
            // fallback
            if (fallbackRates[from] && fallbackRates[from][to]) {
              const frate = fallbackRates[from][to];
              const result = Number(amount) * frate;
              return sendJson(res, {
                from,
                to,
                amount,
                rate: frate,
                result: +result.toFixed(4),
              });
            }
            return sendJson(res, { error: "Unable to convert" }, 400);
          });
        })
        .on("error", () => {
          // fallback in case of network error
          if (fallbackRates[from] && fallbackRates[from][to]) {
            const frate = fallbackRates[from][to];
            const result = Number(amount) * frate;
            return sendJson(res, {
              from,
              to,
              amount,
              rate: frate,
              result: +result.toFixed(4),
            });
          }
          return sendJson(res, { error: "Unable to convert" }, 400);
        });
      return;
    }
    // Возврат списка поддерживаемых банков
    if (url.pathname === "/api/banks") {
      return sendJson(res, BANKS);
    }
    // Возврат подключённых банковских аккаунтов
    if (url.pathname === "/api/sync/connections") {
      return sendJson(res, filterForUser(data.bankConnections || []));
    }
    // Возвращает список подписок
    if (url.pathname === "/api/subscriptions") {
      return sendJson(res, filterForUser(data.subscriptions || []));
    }
    // Возврат списка правил категоризации
    if (url.pathname === "/api/rules") {
      return sendJson(res, filterForUser(data.rules || []));
    }
    if (url.pathname === "/api/rates") {
      // Возврат курсов валют: принимает параметры base и quote
      const base = url.searchParams.get("base") || "USD";
      const quote = url.searchParams.get("quote") || "USD";
      const rateMap = {
        USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
        EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
        PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
        RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 },
      };
      const rate =
        rateMap[base] && rateMap[base][quote] ? rateMap[base][quote] : null;
      if (rate === null) {
        return sendJson(res, { error: "Unsupported currency" }, 400);
      }
      return sendJson(res, { base, quote, rate });
    }

    // (удалено) /api/categories и /api/sync — см. switch ниже и POST /api/sync/transactions
    switch (url.pathname) {
      case "/api/accounts":
        return sendJson(res, filterForUser(data.accounts));
      case "/api/categories":
        return sendJson(res, filterForUser(data.categories));
      case "/api/transactions":
        return sendJson(res, filterForUser(data.transactions));
      case "/api/budgets":
        return sendJson(res, filterForUser(data.budgets));
      case "/api/goals":
        return sendJson(res, filterForUser(data.goals));
      case "/api/planned":
        return sendJson(res, filterForUser(data.planned));
      case "/api/forecast": {
        // Простой прогноз: рассчитываем средние ежедневные доходы и расходы за последние 30 дней.
        // Для согласованности все суммы приводим к единой базе (USD).
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        let incomeSum = 0;
        let expenseSum = 0;
        let incomeCount = 0;
        let expenseCount = 0;
        filterForUser(data.transactions).forEach((tx) => {
          const txDate = new Date(tx.date);
          if (txDate >= cutoff && txDate <= now) {
            if (tx.type === "income") {
              const amt = convertAmount(Number(tx.amount), tx.currency || "USD", "USD");
              incomeSum += amt;
              incomeCount++;
            } else if (tx.type === "expense") {
              const amt = convertAmount(Number(tx.amount), tx.currency || "USD", "USD");
              expenseSum += amt;
              expenseCount++;
            }
          }
        });
        const days = 30;
        const avgIncome = incomeSum / days || 0;
        const avgExpense = expenseSum / days || 0;
        const forecast = {
          predicted_income: +(avgIncome * days).toFixed(2),
          predicted_expense: +(avgExpense * days).toFixed(2),
        };
        return sendJson(res, forecast);
      }

  case "/api/recurring": {
        // Выявление цикличных транзакций: ищем повторяющиеся платежи по описанию/категории с периодичностью ~7/14/30/31 дней
        const groupKey = (tx) =>
          (tx.merchant || tx.description || tx.note || tx.category || "unknown")
            .toLowerCase()
            .trim();
        const byKey = new Map();
        filterForUser(data.transactions).forEach((tx) => {
          if (tx.type !== "expense") return;
          const k = groupKey(tx);
          if (!byKey.has(k)) byKey.set(k, []);
          byKey.get(k).push(tx);
        });
        const candidates = [];
        for (const [k, arr] of byKey.entries()) {
          if (arr.length < 2) continue;
          const dates = arr.map((x) => new Date(x.date)).sort((a, b) => a - b);
          const gaps = [];
          for (let i = 1; i < dates.length; i++)
            gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
          const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          const period = [7, 14, 30, 31].reduce(
            (best, p) => (Math.abs(avg - p) < Math.abs(avg - best) ? p : best),
            30
          );
          if (Math.abs(avg - period) <= 3) {
            const amountAvg =
              arr.reduce((a, b) => a + Number(b.amount || 0), 0) / arr.length;
            candidates.push({
              name: k || "unknown",
              count: arr.length,
              avgPeriodDays: Math.round(avg),
              estimatedMonthly: +(amountAvg * (30 / period)).toFixed(2),
              sampleAmount: +amountAvg.toFixed(2),
            });
          }
        }
        candidates.sort((a, b) => b.estimatedMonthly - a.estimatedMonthly);
        return sendJson(res, {
          items: candidates,
          monthly: +candidates
            .reduce((a, b) => a + b.estimatedMonthly, 0)
            .toFixed(2),
        });
      }
      default:
        return sendJson(res, { error: "Not found" }, 404);
    }
  }
  // Обработка POST‑запросов: добавление данных
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Ограничение размера, чтобы предотвратить злоупотребления
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch (err) {
        return sendJson(res, { error: "Invalid JSON" }, 400);
      }
      switch (url.pathname) {
        case "/api/accounts": {
          // payload: { name, currency, balance }
          if (!payload.name || !payload.currency) {
            return sendJson(res, { error: "Missing account parameters" }, 400);
          }
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          if (typeof payload.balance !== "undefined" && isNaN(Number(payload.balance))) {
            return sendJson(res, { error: "Invalid balance" }, 400);
          }
          const newAccount = {
            id: getNextId(data.accounts),
            user_id: userId,
            name: payload.name,
            currency: payload.currency,
            balance: Number(payload.balance) || 0,
          };
          data.accounts.push(newAccount);
          persistData();
          return sendJson(res, newAccount, 201);
        }
        case "/api/categories": {
          // payload: { name, kind }
          if (!payload.name || !payload.kind) {
            return sendJson(res, { error: "Missing category parameters" }, 400);
          }
          if (!["income", "expense"].includes(payload.kind)) {
            return sendJson(res, { error: "Invalid category kind" }, 400);
          }
          const newCategory = {
            id: getNextId(data.categories),
            user_id: userId,
            name: payload.name,
            kind: payload.kind,
          };
          data.categories.push(newCategory);
          persistData();
          return sendJson(res, newCategory, 201);
        }
        case "/api/transactions": {
          // payload: { account_id, category_id, type, amount, currency, date, note }
          if (
            !payload.account_id ||
            !payload.category_id ||
            !payload.type ||
            payload.amount == null ||
            !payload.date ||
            !payload.currency
          ) {
            return sendJson(
              res,
              { error: "Missing transaction parameters" },
              400
            );
          }
          if (!["income", "expense"].includes(payload.type)) {
            return sendJson(res, { error: "Invalid transaction type" }, 400);
          }
          if (isNaN(Number(payload.amount)) || Number(payload.amount) < 0) {
            return sendJson(res, { error: "Invalid amount" }, 400);
          }
          const txDate = new Date(payload.date);
          if (Number.isNaN(txDate.getTime())) {
            return sendJson(res, { error: "Invalid date" }, 400);
          }
          // Валюта должна быть из допустимого списка
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          const acc = findForUser(data.accounts, Number(payload.account_id));
          if (!acc) return sendJson(res, { error: "Account not found" }, 404);
          const cat = findForUser(data.categories, Number(payload.category_id));
          if (!cat) return sendJson(res, { error: "Category not found" }, 404);
          // Согласованность типа операции и типа категории
          if ((cat.kind === "income" && payload.type !== "income") || (cat.kind === "expense" && payload.type !== "expense")) {
            return sendJson(res, { error: "Transaction type does not match category kind" }, 400);
          }
          const newId = getNextId(data.transactions);
          const newTx = {
            id: newId,
            user_id: userId,
            account_id: Number(payload.account_id),
            category_id: Number(payload.category_id),
            type: payload.type,
            amount: Number(payload.amount),
            currency: payload.currency,
            date: payload.date,
            note: payload.note || "",
          };
          const accountCurrency = acc.currency || "USD";
          const txCurrency = newTx.currency || accountCurrency;
          const adjustment = convertAmount(Number(newTx.amount), txCurrency, accountCurrency);
          const nextBalance =
            newTx.type === "income"
              ? Number(acc.balance) + Number(adjustment)
              : Number(acc.balance) - Number(adjustment);
          if (!Number.isFinite(nextBalance)) {
            return sendJson(res, { error: "Unable to update account balance" }, 400);
          }
          let budgetToUpdate = null;
          let budgetNextSpent = null;
          if (newTx.type === "expense") {
            budgetToUpdate = resolveBudgetForExpense(data, newTx, userId, true);
            if (budgetToUpdate) {
              const bCur = budgetToUpdate.currency || "USD";
              const delta = convertAmount(Number(newTx.amount), txCurrency, bCur);
              budgetNextSpent = Number(budgetToUpdate.spent) + Number(delta);
              if (!Number.isFinite(budgetNextSpent)) {
                return sendJson(res, { error: "Unable to update budget" }, 400);
              }
            }
          }
          acc.balance = nextBalance;
          if (budgetToUpdate && budgetNextSpent != null) {
            budgetToUpdate.spent = budgetNextSpent;
          }
          data.transactions.push(newTx);
          persistData();
          return sendJson(res, newTx, 201);
        }
        case "/api/budgets": {
          // payload: { category_id, month, limit, type, percent, currency? }
          // type: 'fixed' | 'percent'. Если 'percent', то берётся процент от дохода.
          if (!payload.category_id || !payload.month) {
            return sendJson(res, { error: "Missing budget parameters" }, 400);
          }
          const category = findForUser(
            data.categories,
            Number(payload.category_id)
          );
          if (!category) {
            return sendJson(res, { error: "Category not found" }, 404);
          }
          if (payload.type && !["fixed", "percent"].includes(payload.type)) {
            return sendJson(res, { error: "Invalid budget type" }, 400);
          }
          if (payload.percent != null) {
            const p = Number(payload.percent);
            if (isNaN(p) || p < 0 || p > 100) {
              return sendJson(res, { error: "Invalid percent" }, 400);
            }
          }
          const bCurrency = ALLOWED_CURRENCIES.includes(String(payload.currency))
            ? String(payload.currency)
            : "USD";
          let budget = data.budgets.find(
            (b) =>
              b.user_id === userId &&
              b.category_id === Number(payload.category_id) &&
              b.month === payload.month
          );
          if (!budget) {
            budget = {
              id: getNextId(data.budgets),
              user_id: userId,
              category_id: Number(payload.category_id),
              month: payload.month,
              limit: Number(payload.limit) || 0,
              spent: 0,
              type: payload.type || "fixed",
              percent:
                payload.percent != null ? Number(payload.percent) : null,
              currency: bCurrency,
            };
            data.budgets.push(budget);
            persistData();
            return sendJson(res, budget, 201);
          } else {
            budget.limit = Number(payload.limit) || 0;
            budget.type = payload.type || "fixed";
            budget.percent = payload.percent != null ? Number(payload.percent) : null;
            budget.currency = bCurrency;
            persistData();
            return sendJson(res, budget, 200);
          }
        }
        case "/api/goals": {
          // payload: { title, target_amount, current_amount, deadline }
          if (!payload.title || !payload.target_amount) {
            return sendJson(res, { error: "Missing goal parameters" }, 400);
          }
          const targetAmount = Number(payload.target_amount);
          const currentAmount = Number(payload.current_amount || 0);
          if (!Number.isFinite(targetAmount) || targetAmount < 0) {
            return sendJson(res, { error: "Invalid target_amount" }, 400);
          }
          if (!Number.isFinite(currentAmount) || currentAmount < 0) {
            return sendJson(res, { error: "Invalid current_amount" }, 400);
          }
          const newGoal = {
            id: getNextId(data.goals),
            user_id: userId,
            title: payload.title,
            target_amount: targetAmount,
            current_amount: currentAmount,
            deadline: payload.deadline || null,
          };
          data.goals.push(newGoal);
          persistData();
          return sendJson(res, newGoal, 201);
        }
        case "/api/planned": {
          // payload: { account_id, category_id, type, amount, currency, start_date, frequency, note? }
          if (
            !payload.account_id ||
            !payload.category_id ||
            !payload.type ||
            payload.amount == null ||
            !payload.currency ||
            !payload.frequency
          ) {
            return sendJson(
              res,
              { error: "Missing planned operation parameters" },
              400
            );
          }
          if (!["income", "expense"].includes(String(payload.type))) {
            return sendJson(res, { error: "Invalid type" }, 400);
          }
          if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          const plannedAccount = findForUser(
            data.accounts,
            Number(payload.account_id)
          );
          if (!plannedAccount) {
            return sendJson(res, { error: "Account not found" }, 404);
          }
          const plannedCategory = findForUser(
            data.categories,
            Number(payload.category_id)
          );
          if (!plannedCategory) {
            return sendJson(res, { error: "Category not found" }, 404);
          }
          if (
            (plannedCategory.kind === "income" && payload.type !== "income") ||
            (plannedCategory.kind === "expense" && payload.type !== "expense")
          ) {
            return sendJson(res, { error: "Type does not match category" }, 400);
          }
          const plannedAmount = Number(payload.amount);
          if (!Number.isFinite(plannedAmount) || plannedAmount < 0) {
            return sendJson(res, { error: "Invalid amount" }, 400);
          }
          const newPlanned = {
            id: getNextId(data.planned),
            user_id: userId,
            account_id: Number(payload.account_id),
            category_id: Number(payload.category_id),
            type: payload.type,
            amount: plannedAmount,
            currency: payload.currency,
            start_date:
              payload.start_date || new Date().toISOString().slice(0, 10),
            frequency: payload.frequency,
            note: payload.note || "",
          };
          data.planned.push(newPlanned);
          persistData();
          return sendJson(res, newPlanned, 201);
        }
        case "/api/rules": {
          // payload: { keyword, category_id }
          if (payload.keyword == null || payload.category_id == null) {
            return sendJson(res, { error: "Missing rule parameters" }, 400);
          }
          const ruleCategory = findForUser(
            data.categories,
            Number(payload.category_id)
          );
          if (!ruleCategory) {
            return sendJson(res, { error: "Category not found" }, 404);
          }
          // Lowercase keyword to ensure case-insensitive matching
          const newRule = {
            id: getNextId(data.rules),
            user_id: userId,
            keyword: String(payload.keyword).toLowerCase(),
            category_id: Number(payload.category_id),
          };
          data.rules.push(newRule);
          persistData();
          return sendJson(res, newRule, 201);
        }
        case "/api/subscriptions": {
          // payload: { title, amount, currency, frequency, next_date }
          const { title, amount, currency, frequency, next_date } = payload;
          if (!title || amount == null || !currency || !frequency) {
            return sendJson(
              res,
              { error: "Missing subscription parameters" },
              400
            );
          }
          if (isNaN(Number(amount)) || Number(amount) < 0) {
            return sendJson(res, { error: "Invalid amount" }, 400);
          }
          if (!ALLOWED_CURRENCIES.includes(String(currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          const allowedFreq = ["weekly", "monthly", "yearly"];
          if (!allowedFreq.includes(String(frequency))) {
            return sendJson(res, { error: "Invalid frequency" }, 400);
          }
          const newSub = {
            id: getNextId(data.subscriptions),
            user_id: userId,
            title: title,
            amount: Number(amount),
            currency: currency,
            frequency: frequency,
            next_date: next_date || null,
          };
          data.subscriptions.push(newSub);
          persistData();
          return sendJson(res, newSub, 201);
        }
        case "/api/sync/connect": {
          // payload: { bank_id, account_id, login, password }
          const {
            bank_id,
            account_id,
            login: bankLogin,
            password: bankPassword,
          } = payload;
          const bankId = Number(bank_id);
          let accId = Number(account_id);
          if (!bankId) {
            return sendJson(res, { error: "Missing bank_id" }, 400);
          }
          // Если не указан account_id, пытаемся выбрать первый счёт
          if (!accId) {
            const userAccounts = filterForUser(data.accounts);
            if (!userAccounts || userAccounts.length === 0) {
              return sendJson(res, { error: "Нет доступных счетов" }, 400);
            }
            accId = userAccounts[0].id;
          }
          const linkedAccount = findForUser(data.accounts, accId);
          if (!linkedAccount) {
            return sendJson(res, { error: "Account not found" }, 404);
          }
          const bank = BANKS.find((b) => b.id === bankId);
          if (!bank) {
            return sendJson(res, { error: "Банк не найден" }, 404);
          }
          const connId = getNextId(data.bankConnections);
          const newConn = {
            id: connId,
            user_id: userId,
            bank_id: bank.id,
            bank_name: bank.name,
            account_id: accId,
            login: bankLogin || "",
            created_at: new Date().toISOString(),
          };
          data.bankConnections.push(newConn);
          persistData();
          return sendJson(res, newConn, 201);
        }
        case "/api/sync/transactions": {
          // payload: { connection_id }
          const { connection_id } = payload;
          const connId = Number(connection_id);
          if (!connId) {
            return sendJson(res, { error: "Missing connection_id" }, 400);
          }
          const connection = findForUser(data.bankConnections, connId);
          if (!connection) {
            return sendJson(res, { error: "Connection not found" }, 404);
          }
          // ensure there is a linked account
          const acc = findForUser(data.accounts, connection.account_id);
          if (!acc) {
            return sendJson(res, { error: "Account not found" }, 404);
          }
          const samples = MOCK_BANK_TRANSACTIONS[connection.bank_id] || [];
          if (!samples.length) {
            return sendJson(
              res,
              {
                synced: 0,
                transactions: [],
                skipped: [
                  {
                    reason: "No mock data for bank",
                    bank_id: connection.bank_id,
                  },
                ],
              },
              200
            );
          }
          const existingTransactions = filterForUser(data.transactions);
          const userCategories = filterForUser(data.categories);
          const newTxs = [];
          const skipped = [];
          const pickCategory = (sample) => {
            if (!sample.category) return null;
            const { name, kind } = sample.category;
            let category = null;
            if (name) {
              category = userCategories.find(
                (c) => c.name && c.name.toLowerCase() === String(name).toLowerCase()
              );
            }
            if (!category && kind) {
              category = userCategories.find((c) => c.kind === kind);
            }
            return category || null;
          };
          for (const sample of samples) {
            const category = pickCategory(sample);
            if (!category) {
              skipped.push({
                external_id: sample.external_id,
                description: sample.description,
                reason: "Category not available for user",
              });
              continue;
            }
            if (
              (category.kind === "income" && sample.type !== "income") ||
              (category.kind === "expense" && sample.type !== "expense")
            ) {
              skipped.push({
                external_id: sample.external_id,
                description: sample.description,
                reason: "Category kind mismatch",
              });
              continue;
            }
            const txCurrency = sample.currency || acc.currency || "USD";
            const txDate = sample.date || new Date().toISOString().slice(0, 10);
            const noteBase = sample.description
              ? `${sample.description}`
              : `Синхронизация банка ${connection.bank_name}`;
            const note = `${noteBase} (синхр. ${connection.bank_name})`;
            const duplicate = existingTransactions.some(
              (t) =>
                t.user_id === userId &&
                t.account_id === acc.id &&
                t.external_id &&
                sample.external_id &&
                t.external_id === sample.external_id
            );
            if (duplicate) {
              skipped.push({
                external_id: sample.external_id,
                description: sample.description,
                reason: "Already synced",
              });
              continue;
            }
            const amountValue = Number(sample.amount);
            if (!Number.isFinite(amountValue) || amountValue < 0) {
              skipped.push({
                external_id: sample.external_id,
                description: sample.description,
                reason: "Invalid amount",
              });
              continue;
            }
            const newTx = {
              id: getNextId(data.transactions),
              user_id: userId,
              account_id: acc.id,
              category_id: category.id,
              type: sample.type,
              amount: amountValue,
              currency: txCurrency,
              date: txDate,
              note,
              external_id: sample.external_id,
            };
            const accountCurrency = acc.currency || "USD";
            const adjustment = convertAmount(
              Number(newTx.amount),
              txCurrency,
              accountCurrency
            );
            const updatedBalance =
              newTx.type === "income"
                ? Number(acc.balance) + Number(adjustment)
                : Number(acc.balance) - Number(adjustment);
            if (!Number.isFinite(updatedBalance)) {
              skipped.push({
                external_id: sample.external_id,
                description: sample.description,
                reason: "Unable to update account balance",
              });
              continue;
            }
            acc.balance = updatedBalance;
            if (newTx.type === "expense") {
              const budget = resolveBudgetForExpense(data, newTx, userId, true);
              adjustBudgetWithTransaction(budget, newTx, 1);
            }
            data.transactions.push(newTx);
            existingTransactions.push(newTx);
            newTxs.push(newTx);
          }
          if (newTxs.length > 0) {
            persistData();
          }
          return sendJson(
            res,
            { synced: newTxs.length, transactions: newTxs, skipped },
            newTxs.length > 0 ? 201 : 200
          );
        }
        default:
          return sendJson(res, { error: "Not found" }, 404);
      }
    });
    return;
  }
  // Метод не поддерживается
  return sendJson(res, { error: "Method not allowed" }, 405);
}

/**
 * Раздача статических файлов из каталога `public`.
 * Защита от выхода за пределы директории.
 */
function handleStatic(req, res) {
  let safePath = req.url;

  // Отрезаем query (?...) и хэши (#...) — они могут быть от встроенного браузера VS Code
  safePath = safePath.split("?")[0].split("#")[0];

  // Корневая страница
  if (safePath === "/") {
    safePath = "/landing.html";
  }

  const publicDir = path.join(__dirname, "..", "public");

  // Убираем ведущий /, чтобы path.join не попытался сделать абсолютный путь
  if (safePath.startsWith("/")) {
    safePath = safePath.slice(1);
  }

  // Нормализуем путь и ограничиваем директорию
  const filePath = path.normalize(
    path.join(publicDir, decodeURIComponent(safePath))
  );

  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  // Check if file exists
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

// Создание HTTP‑сервера
function createServer() {
  return http.createServer((req, res) => {
    // SECURITY: Log only in development, avoid exposing URLs in production
    if (process.env.NODE_ENV !== "production") {
      console.log("REQ:", req.method, req.url);
    }

    // Обрабатываем API‑запросы отдельно, независимо от HTTP‑метода
    if (req.url.startsWith("/api/")) {
      return handleApi(req, res);
    }
    // Для нестатических путей разрешаем только GET
    if (req.method !== "GET") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }
    // Остальные запросы считаем статикой
    return handleStatic(req, res);
  });
}

const server = createServer();

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`FinTrackr server listening on http://localhost:${PORT}`);
  });
}

module.exports = {
  BANKS,
  RATE_MAP,
  convertAmount,
  createServer,
  getData,
  handleApi,
  handleStatic,
  persistData,
  sendJson,
  setData,
  server,
};
