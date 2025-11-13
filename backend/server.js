const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 минут
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 дней
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

// Определяем MIME-типы для разных расширений
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

// Список поддерживаемых банков. В реальном приложении это получалось бы из внешнего сервиса.
const BANKS = [
  { id: 1, name: "Тинькофф" },
  { id: 2, name: "Сбербанк" },
  { id: 3, name: "Альфа-Банк" },
  { id: 4, name: "ВТБ" },
];

// Загружаем данные из файла JSON; в реальном приложении здесь бы была БД
const dataPath = path.join(__dirname, "data.json");
let data;
try {
  data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  // Дополняем недостающие разделы данными по умолчанию
  if (!data.goals) data.goals = [];
  if (!data.planned) data.planned = [];
  if (!data.users) data.users = [];
  // Подключённые банковские аккаунты. Используется для синхронизации.
  if (!data.bankConnections) data.bankConnections = [];
  // Подписки пользователей (используется для отслеживания подписок/сервисов).
  if (!data.subscriptions) data.subscriptions = [];
  // Правила автоматической категоризации (ключевое слово → id категории)
  if (!data.rules) data.rules = [];
  if (!data.refreshTokens) data.refreshTokens = [];
  if (!data.tokenBlacklist) data.tokenBlacklist = [];
} catch (err) {
  console.error("Ошибка чтения файла данных:", err);
  data = {
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    goals: [],
    planned: [],
    users: [],
    bankConnections: [],
    subscriptions: [],
    refreshTokens: [],
    tokenBlacklist: [],
  };
}

/**
 * Сохраняет текущее состояние `data` в файл. Если происходит ошибка, выводит её в консоль.
 */
function persistData() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Ошибка записи файла данных:", err);
  }
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
  const sameSite = options.sameSite || "Strict";
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
  const sameSite = options.sameSite || "Strict";
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
    console.error("Ошибка проверки токена", err);
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

  // Обработка DELETE‑запросов для API (удаление сущностей)
  if (req.method === "DELETE") {
    const auth = requireAuth(req, res);
    if (!auth) return;
    // Удаление категории: /api/categories/:id
    const catMatch = url.pathname.match(/^\/api\/categories\/(\d+)$/);
    if (catMatch) {
      const catId = Number(catMatch[1]);
      const index = data.categories.findIndex((c) => c.id === catId);
      if (index === -1) {
        return sendJson(res, { error: "Category not found" }, 404);
      }
      // Удаляем категорию
      data.categories.splice(index, 1);
      // Также удаляем связанные бюджеты и плановые операции по этой категории
      data.budgets = data.budgets.filter((b) => b.category_id !== catId);
      data.planned = data.planned.filter((p) => p.category_id !== catId);
      // Очищаем ссылку на категорию в транзакциях
      data.transactions.forEach((tx) => {
        if (tx.category_id === catId) tx.category_id = null;
      });
      persistData();
      return sendJson(res, { success: true }, 200);
    }
    // Удаление подписки: /api/subscriptions/:id
    const subMatch = url.pathname.match(/^\/api\/subscriptions\/(\d+)$/);
    if (subMatch) {
      const subId = Number(subMatch[1]);
      const idx = data.subscriptions.findIndex((s) => s.id === subId);
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
      const rIndex = data.rules.findIndex((r) => r.id === ruleId);
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
      const idx = data.transactions.findIndex((t) => t.id === txId);
      if (idx === -1) return sendJson(res, { error: "Transaction not found" }, 404);
      const tx = data.transactions[idx];
      // Откат баланса счёта с учётом валюты счёта
      const acc = data.accounts.find((a) => a.id === tx.account_id);
      if (acc) {
        const adj = convertAmount(Number(tx.amount), tx.currency || acc.currency || "USD", acc.currency || "USD");
        if (tx.type === "income") acc.balance = Number(acc.balance) - adj;
        else acc.balance = Number(acc.balance) + adj;
      }
      // Откат бюджета (если расход)
      if (tx.type === "expense") {
        const dt = new Date(tx.date);
        const month = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
        const b = data.budgets.find((b) => b.category_id === tx.category_id && b.month === month);
        if (b) {
          const bCur = b.currency || "USD";
          const dec = convertAmount(Number(tx.amount), tx.currency || "USD", bCur);
          b.spent = Math.max(0, Number(b.spent) - Number(dec));
        }
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
        const acc = data.accounts.find((a) => a.id === id);
        if (!acc) return sendJson(res, { error: "Account not found" }, 404);
        const allowedCur = ["USD", "EUR", "PLN", "RUB"];
        if (payload.name != null) acc.name = String(payload.name);
        if (payload.currency != null) {
          if (!allowedCur.includes(String(payload.currency))) {
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
        const cat = data.categories.find((c) => c.id === id);
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
      // budgets update
      m = url.pathname.match(/^\/api\/budgets\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const budget = data.budgets.find((b) => b.id === id);
        if (!budget) return sendJson(res, { error: "Budget not found" }, 404);
        const allowedCur = ["USD", "EUR", "PLN", "RUB"];
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
          if (!allowedCur.includes(String(payload.currency))) {
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
        const goal = data.goals.find((g) => g.id === id);
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
        const plan = data.planned.find((p) => p.id === id);
        if (!plan) return sendJson(res, { error: "Planned not found" }, 404);
        const allowedCur = ["USD", "EUR", "PLN", "RUB"];
        if (payload.account_id != null) plan.account_id = Number(payload.account_id);
        if (payload.category_id != null) plan.category_id = Number(payload.category_id);
        if (payload.type != null) {
          if (!["income", "expense"].includes(String(payload.type))) {
            return sendJson(res, { error: "Invalid type" }, 400);
          }
          plan.type = String(payload.type);
        }
        if (payload.amount != null) {
          const a = Number(payload.amount);
          if (!isFinite(a) || a < 0) return sendJson(res, { error: "Invalid amount" }, 400);
          plan.amount = a;
        }
        if (payload.currency != null) {
          if (!allowedCur.includes(String(payload.currency))) {
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
        const sub = data.subscriptions.find((s) => s.id === id);
        if (!sub) return sendJson(res, { error: "Subscription not found" }, 404);
        const allowedCur = ["USD", "EUR", "PLN", "RUB"];
        const allowedFreq = ["weekly", "monthly", "yearly"];
        if (payload.title != null) sub.title = String(payload.title);
        if (payload.amount != null) {
          const a = Number(payload.amount);
          if (!isFinite(a) || a < 0) return sendJson(res, { error: "Invalid amount" }, 400);
          sub.amount = a;
        }
        if (payload.currency != null) {
          if (!allowedCur.includes(String(payload.currency))) {
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
        const rule = data.rules.find((r) => r.id === id);
        if (!rule) return sendJson(res, { error: "Rule not found" }, 404);
        if (payload.keyword != null) rule.keyword = String(payload.keyword).toLowerCase();
        if (payload.category_id != null) rule.category_id = Number(payload.category_id);
        persistData();
        return sendJson(res, rule, 200);
      }
      return sendJson(res, { error: "Not found" }, 404);
    });
    return;
  }
  // Обработка GET‑запросов
  if (req.method === "GET") {
    const auth = requireAuth(req, res);
    if (!auth) return;
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
      return sendJson(res, data.bankConnections || []);
    }
    // Возвращает список подписок
    if (url.pathname === "/api/subscriptions") {
      return sendJson(res, data.subscriptions || []);
    }
    // Возврат списка правил категоризации
    if (url.pathname === "/api/rules") {
      return sendJson(res, data.rules || []);
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
        return sendJson(res, data.accounts);
      case "/api/categories":
        return sendJson(res, data.categories);
      case "/api/transactions":
        return sendJson(res, data.transactions);
      case "/api/budgets":
        return sendJson(res, data.budgets);
      case "/api/goals":
        return sendJson(res, data.goals);
      case "/api/planned":
        return sendJson(res, data.planned);
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
        data.transactions.forEach((tx) => {
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
        data.transactions.forEach((tx) => {
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
      // Генерация следующего ID
      const getNextId = (arr) =>
        arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
      const cookies = parseCookies(req);

      if (url.pathname === "/api/register") {
        if (!payload.name || !payload.email || !payload.password) {
          return sendJson(res, { error: "Missing registration parameters" }, 400);
        }
        const exists = data.users.find((u) => u.email === payload.email);
        if (exists) {
          return sendJson(res, { error: "User already exists" }, 400);
        }
        const salt = bcrypt.genSaltSync(12);
        const hash = bcrypt.hashSync(payload.password, salt);
        const newUser = {
          id: getNextId(data.users),
          name: payload.name,
          email: payload.email,
          password_salt: salt,
          password_hash: hash,
          created_at: new Date().toISOString(),
        };
        data.users.push(newUser);
        const tokens = issueTokensForUser(newUser);
        setAuthCookies(res, tokens);
        persistData();
        return sendJson(res, { user: sanitizeUser(newUser) }, 201);
      }

      if (url.pathname === "/api/login") {
        if (!payload.email || !payload.password) {
          return sendJson(res, { error: "Missing login parameters" }, 400);
        }
        const user = data.users.find((u) => u.email === payload.email);
        if (!user) {
          return sendJson(res, { error: "Invalid email or password" }, 401);
        }
        let passwordValid = false;
        if (user.password_hash && user.password_salt) {
          passwordValid = bcrypt.compareSync(payload.password, user.password_hash);
        } else if (user.password_hash) {
          const legacyHash = crypto
            .createHash("sha256")
            .update(payload.password)
            .digest("hex");
          if (legacyHash === user.password_hash) {
            const salt = bcrypt.genSaltSync(12);
            const hash = bcrypt.hashSync(payload.password, salt);
            user.password_salt = salt;
            user.password_hash = hash;
            persistData();
            passwordValid = true;
          }
        }
        if (!passwordValid) {
          return sendJson(res, { error: "Invalid email or password" }, 401);
        }
        const before = data.refreshTokens.length;
        data.refreshTokens = data.refreshTokens.filter(
          (entry) => entry.userId !== user.id
        );
        if (before !== data.refreshTokens.length) {
          persistData();
        }
        const tokens = issueTokensForUser(user);
        setAuthCookies(res, tokens);
        return sendJson(res, { user: sanitizeUser(user) });
      }

      if (url.pathname === "/api/token/refresh") {
        const refreshToken = payload.refresh_token || cookies.refresh_token;
        if (!refreshToken) {
          return sendJson(res, { error: "Missing refresh token" }, 401);
        }
        const refreshData = consumeRefreshToken(refreshToken);
        if (!refreshData || !refreshData.user) {
          clearAuthCookies(res);
          return sendJson(res, { error: "Invalid refresh token" }, 401);
        }
        const tokens = issueTokensForUser(refreshData.user);
        setAuthCookies(res, tokens);
        return sendJson(res, {
          user: sanitizeUser(refreshData.user),
          accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
        });
      }

      if (url.pathname === "/api/logout") {
        const refreshToken = payload.refresh_token || cookies.refresh_token;
        if (refreshToken) {
          const before = data.refreshTokens.length;
          data.refreshTokens = data.refreshTokens.filter(
            (entry) => entry.token !== refreshToken
          );
          if (before !== data.refreshTokens.length) {
            persistData();
          }
        }
        let accessToken = cookies.access_token;
        const authHeader = req.headers.authorization || "";
        if (!accessToken && authHeader.startsWith("Bearer ")) {
          accessToken = authHeader.slice(7).trim();
        }
        if (accessToken) {
          const decoded = jwt.decode(accessToken);
          const expMs = decoded && decoded.exp ? decoded.exp * 1000 : undefined;
          addTokenToBlacklist(accessToken, expMs);
        }
        clearAuthCookies(res);
        return sendJson(res, { success: true });
      }

      const auth = requireAuth(req, res);
      if (!auth) return;

      switch (url.pathname) {
        case "/api/accounts": {
          // payload: { name, currency, balance }
          if (!payload.name || !payload.currency) {
            return sendJson(res, { error: "Missing account parameters" }, 400);
          }
          if (typeof payload.balance !== "undefined" && isNaN(Number(payload.balance))) {
            return sendJson(res, { error: "Invalid balance" }, 400);
          }
          const newAccount = {
            id: getNextId(data.accounts),
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
          // Валюта должна быть из допустимого списка
          const allowedCur = ["USD", "EUR", "PLN", "RUB"];
          if (!allowedCur.includes(String(payload.currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          const acc = data.accounts.find((a) => a.id === Number(payload.account_id));
          if (!acc) return sendJson(res, { error: "Account not found" }, 404);
          const cat = data.categories.find((c) => c.id === Number(payload.category_id));
          if (!cat) return sendJson(res, { error: "Category not found" }, 404);
          // Согласованность типа операции и типа категории
          if ((cat.kind === "income" && payload.type !== "income") || (cat.kind === "expense" && payload.type !== "expense")) {
            return sendJson(res, { error: "Transaction type does not match category kind" }, 400);
          }
          const newId = getNextId(data.transactions);
          const newTx = {
            id: newId,
            account_id: Number(payload.account_id),
            category_id: Number(payload.category_id),
            type: payload.type,
            amount: Number(payload.amount),
            currency: payload.currency,
            date: payload.date,
            note: payload.note || "",
          };
          data.transactions.push(newTx);
          // Обновляем баланс счёта с учётом валюты счёта
          if (acc) {
            const adj = convertAmount(
              Number(newTx.amount),
              newTx.currency || acc.currency || "USD",
              acc.currency || "USD"
            );
            if (newTx.type === "income") {
              acc.balance = Number(acc.balance) + adj;
            } else {
              acc.balance = Number(acc.balance) - adj;
            }
          }
          // Обновляем бюджет по категории и месяцу (если тип расход)
          if (newTx.type === "expense") {
            const dt = new Date(newTx.date);
            const month =
              dt.getFullYear() +
              "-" +
              String(dt.getMonth() + 1).padStart(2, "0");
            // Ищем бюджет для этой категории и месяца
            let budget = data.budgets.find(
              (b) => b.category_id === newTx.category_id && b.month === month
            );
            if (!budget) {
              budget = {
                id: getNextId(data.budgets),
                category_id: newTx.category_id,
                month,
                limit: 0,
                spent: 0,
                currency: "USD",
              };
              data.budgets.push(budget);
            }
            // Если у бюджета задана валюта, конвертируем расход в валюту бюджета
            const bCur = budget.currency || "USD";
            const add = convertAmount(Number(newTx.amount), newTx.currency || "USD", bCur);
            budget.spent = Number(budget.spent) + Number(add);
          }
          persistData();
          return sendJson(res, newTx, 201);
        }
        case "/api/budgets": {
          // payload: { category_id, month, limit, type, percent, currency? }
          // type: 'fixed' | 'percent'. Если 'percent', то берётся процент от дохода.
          if (!payload.category_id || !payload.month) {
            return sendJson(res, { error: "Missing budget parameters" }, 400);
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
          const allowedCur = ["USD", "EUR", "PLN", "RUB"];
          const bCurrency = allowedCur.includes(String(payload.currency))
            ? String(payload.currency)
            : "USD";
          let budget = data.budgets.find(
            (b) =>
              b.category_id === Number(payload.category_id) &&
              b.month === payload.month
          );
          if (!budget) {
            budget = {
              id: getNextId(data.budgets),
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
          const newGoal = {
            id: getNextId(data.goals),
            title: payload.title,
            target_amount: Number(payload.target_amount),
            current_amount: Number(payload.current_amount) || 0,
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
          const newPlanned = {
            id: getNextId(data.planned),
            account_id: Number(payload.account_id),
            category_id: Number(payload.category_id),
            type: payload.type,
            amount: Number(payload.amount),
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
          if (!payload.keyword || typeof payload.category_id !== "number") {
            return sendJson(res, { error: "Missing rule parameters" }, 400);
          }
          // Lowercase keyword to ensure case-insensitive matching
          const newRule = {
            id: getNextId(data.rules),
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
          const allowedCur = ["USD", "EUR", "PLN", "RUB"];
          if (!allowedCur.includes(String(currency))) {
            return sendJson(res, { error: "Invalid currency" }, 400);
          }
          const allowedFreq = ["weekly", "monthly", "yearly"];
          if (!allowedFreq.includes(String(frequency))) {
            return sendJson(res, { error: "Invalid frequency" }, 400);
          }
          const getNextId = (arr) =>
            arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
          const newSub = {
            id: getNextId(data.subscriptions),
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
            if (!data.accounts || data.accounts.length === 0) {
              return sendJson(res, { error: "Нет доступных счетов" }, 400);
            }
            accId = data.accounts[0].id;
          }
          const bank = BANKS.find((b) => b.id === bankId);
          if (!bank) {
            return sendJson(res, { error: "Банк не найден" }, 404);
          }
          // генерируем id
          const getNextId = (arr) =>
            arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
          const connId = getNextId(data.bankConnections);
          const newConn = {
            id: connId,
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
          const connection = data.bankConnections.find((c) => c.id === connId);
          if (!connection) {
            return sendJson(res, { error: "Connection not found" }, 404);
          }
          // ensure there is a linked account
          const acc = data.accounts.find((a) => a.id === connection.account_id);
          if (!acc) {
            return sendJson(res, { error: "Account not found" }, 404);
          }
          // categories for expenses (filter expense categories)
          const categoriesList = data.categories.filter(
            (c) => c.kind === "expense" || !c.kind
          );
          const getNextTxId = (arr) =>
            arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
          const newTxs = [];
          for (let i = 0; i < 3; i++) {
            const randomCat =
              categoriesList[Math.floor(Math.random() * categoriesList.length)];
            const amount = Math.round(Math.random() * 100 + 10);
            const dateStr = new Date().toISOString().slice(0, 10);
            const newTx = {
              id: getNextTxId(data.transactions),
              account_id: acc.id,
              category_id: randomCat ? randomCat.id : null,
              type: "expense",
              amount: amount,
              currency: acc.currency || "USD",
              date: dateStr,
              note: `Синхронизация банка ${connection.bank_name}`,
            };
            data.transactions.push(newTx);
            // обновляем баланс счёта
            acc.balance = Number(acc.balance) - amount;
            newTxs.push(newTx);
          }
          persistData();
          return sendJson(
            res,
            { synced: newTxs.length, transactions: newTxs },
            201
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

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Файл не найден
      res.statusCode = 404;
      return res.end("Not Found");
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.statusCode = 200;
    res.setHeader("Content-Type", mime);
    res.end(content);
  });
}

// Создание HTTP‑сервера
const server = http.createServer((req, res) => {
  // Логирование запросов для отладки
  console.log("REQ:", req.method, req.url);
  
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`FinTrackr server listening on http://localhost:${PORT}`);
});
