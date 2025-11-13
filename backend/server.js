const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
  // Правила автоматической категоризации
  if (!data.rules) data.rules = [];
  // Правила автоматической категоризации (ключевое слово → id категории)
  if (!data.rules) data.rules = [];
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

/**
 * Обработка запроса к API: отдаёт данные из объекта `data`
 */
function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Обработка DELETE‑запросов для API (удаление сущностей)
  if (req.method === "DELETE") {
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
    // Фолбэк для неподдерживаемых DELETE
    return sendJson(res, { error: "Not found" }, 404);
  }
  // Обработка GET‑запросов
  if (req.method === "GET") {
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

    // Возврат списка категорий
    if (url.pathname === "/api/categories") {
      return sendJson(res, data.categories || []);
    }
    if (url.pathname === "/api/sync") {
      // TODO: Replace with real bank API integration
      // MOCK: Симуляция синхронизации с банком - создает случайные транзакции
      if (data.accounts.length === 0 || data.categories.length === 0) {
        return sendJson(
          res,
          { message: "Нет счётов или категорий для синхронизации" },
          400
        );
      }
      const accountId = data.accounts[0].id;
      const categoriesList = data.categories.filter(
        (c) => c.kind === "expense" || !c.kind
      );
      const created = [];
      const getNextId = (arr) =>
        arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
      
      // MOCK: Создание 3 случайных транзакций
      // TODO: Заменить на реальные данные от банковского API
      for (let i = 0; i < 3; i++) {
        const randomCat =
          categoriesList[Math.floor(Math.random() * categoriesList.length)];
        const amount = Math.round(Math.random() * 100 + 10);
        const dateStr = new Date().toISOString().slice(0, 10);
        const newTx = {
          id: getNextId(data.transactions),
          account_id: accountId,
          category_id: randomCat ? randomCat.id : null,
          type: "expense",
          amount,
          currency: "USD",
          date: dateStr,
          note: "Синхронизация банка",
        };
        data.transactions.push(newTx);
        // обновляем баланс счёта
        const acc = data.accounts.find((a) => a.id === accountId);
        if (acc) acc.balance = Number(acc.balance) - amount;
        created.push(newTx);
      }
      persistData();
      return sendJson(res, { synced: created.length, transactions: created });
    }
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
        // Простой прогноз: рассчитываем средние ежедневные доходы и расходы за последние 30 дней
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
              incomeSum += Number(tx.amount);
              incomeCount++;
            } else if (tx.type === "expense") {
              expenseSum += Number(tx.amount);
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
      switch (url.pathname) {
        case "/api/accounts": {
          // payload: { name, currency, balance }
          if (!payload.name || !payload.currency) {
            return sendJson(res, { error: "Missing account parameters" }, 400);
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
            !payload.amount ||
            !payload.date ||
            !payload.currency
          ) {
            return sendJson(
              res,
              { error: "Missing transaction parameters" },
              400
            );
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
          // Обновляем баланс счёта
          const account = data.accounts.find((a) => a.id === newTx.account_id);
          if (account) {
            if (newTx.type === "income") {
              account.balance = Number(account.balance) + newTx.amount;
            } else {
              account.balance = Number(account.balance) - newTx.amount;
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
              };
              data.budgets.push(budget);
            }
            budget.spent = Number(budget.spent) + newTx.amount;
          }
          persistData();
          return sendJson(res, newTx, 201);
        }
        case "/api/budgets": {
          // payload: { category_id, month, limit, type, percent }
          // type: 'fixed' | 'percent'. Если 'percent', то берётся процент от дохода.
          if (!payload.category_id || !payload.month) {
            return sendJson(res, { error: "Missing budget parameters" }, 400);
          }
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
              type: payload.type || "fixed",
              percent:
                payload.percent !== undefined ? Number(payload.percent) : null,
              spent: 0,
            };
            data.budgets.push(budget);
          } else {
            // Обновляем лимит или проценты, если указаны
            if (payload.limit !== undefined)
              budget.limit = Number(payload.limit);
            if (payload.type) budget.type = payload.type;
            if (payload.percent !== undefined)
              budget.percent = Number(payload.percent);
          }
          persistData();
          return sendJson(res, budget, 201);
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
          // payload: { account_id, category_id, type, amount, currency, start_date, frequency }
          if (
            !payload.account_id ||
            !payload.category_id ||
            !payload.type ||
            !payload.amount ||
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
        case "/api/register": {
          // payload: { name, email, password }
          if (!payload.name || !payload.email || !payload.password) {
            return sendJson(
              res,
              { error: "Missing registration parameters" },
              400
            );
          }
          // Проверяем уникальность email
          const exists = data.users.find((u) => u.email === payload.email);
          if (exists) {
            return sendJson(res, { error: "User already exists" }, 400);
          }
          const newUser = {
            id: getNextId(data.users),
            name: payload.name,
            email: payload.email,
            password_hash: crypto
              .createHash("sha256")
              .update(payload.password)
              .digest("hex"),
          };
          data.users.push(newUser);
          persistData();
          // Возвращаем пользователя без хеша
          const { password_hash, ...publicUser } = newUser;
          return sendJson(res, publicUser, 201);
        }
        case "/api/login": {
          // payload: { email, password }
          if (!payload.email || !payload.password) {
            return sendJson(res, { error: "Missing login parameters" }, 400);
          }
          const user = data.users.find((u) => u.email === payload.email);
          if (!user) {
            return sendJson(res, { error: "Invalid email or password" }, 401);
          }
          const hash = crypto
            .createHash("sha256")
            .update(payload.password)
            .digest("hex");
          if (hash !== user.password_hash) {
            return sendJson(res, { error: "Invalid email or password" }, 401);
          }
          // Возвращаем пользователя без хеша
          const { password_hash: pw, ...publicUser } = user;
          return sendJson(res, publicUser, 200);
        }
        case "/api/subscriptions": {
          // payload: { title, amount, currency, frequency, next_date }
          const { title, amount, currency, frequency, next_date } = payload;
          if (!title || !amount || !currency || !frequency) {
            return sendJson(
              res,
              { error: "Missing subscription parameters" },
              400
            );
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
  // Корневая страница
  let safePath = req.url;
  if (safePath === "/") {
    // Главная страница показывает лендинг
    safePath = "/landing.html";
  }
  // Нормализуем путь и ограничиваем директорию
  const publicDir = path.join(__dirname, "..", "public");
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`FinTrackr server listening on http://localhost:${PORT}`);
});
