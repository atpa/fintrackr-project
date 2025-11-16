# ⚙️ FinTrackr Backend — Документация

Полное руководство по архитектуре бэкенда, API маршрутах, базе данных и бизнес-логике.

## 📋 Содержание

1. [Архитектура backend](#архитектура-backend)
2. [Структура проекта](#структура-проекта)
3. [Технологический стек](#технологический-стек)
4. [Запуск сервера](#запуск-сервера)
5. [Маршруты API](#маршруты-api)
6. [Примеры запросов/ответов](#примеры-запросовответов)
7. [Middleware система](#middleware-система)
8. [База данных](#база-данных)
9. [Бизнес-логика модулей](#бизнес-логика-модулей)
10. [Обработка ошибок](#обработка-ошибок)
11. [Известные проблемы](#известные-проблемы)

## 🏗️ Архитектура backend

```
┌──────────────────────────────────────────────────────────┐
│              HTTP Request от Frontend                     │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│            Middleware Pipeline (Express)                  │
├──────────────────────────────────────────────────────────┤
│  1. Logger (morgan)                                       │
│  2. JSON Parser (express.json)                           │
│  3. Cookie Parser (cookie-parser)                        │
│  4. Security Headers (security.js)                       │
│  5. CORS Handler                                         │
│  6. CSRF Token Validator (csrf.js)                       │
│  7. Auth Middleware (auth.js) ← JWT verification         │
│  8. Input Validation (validation.js)                     │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│              Router Match (14 routers)                    │
├──────────────────────────────────────────────────────────┤
│  GET /api/accounts        ─→ accountsRouter.get()        │
│  POST /api/transactions   ─→ transactionsRouter.post()   │
│  etc.                                                     │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│         Route Handler (API Endpoint)                      │
├──────────────────────────────────────────────────────────┤
│  1. Validate input                                        │
│  2. Get current user from JWT                           │
│  3. Call service layer                                   │
│  4. Manipulate database                                  │
│  5. Return response                                      │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│          Service Layer (Business Logic)                   │
├──────────────────────────────────────────────────────────┤
│  - accountService.getAccounts(userId)                    │
│  - transactionService.createTransaction(data)           │
│  - budgetService.calculateSpent(budgetId)               │
│  - currencyService.convertAmount(from, to, amount)      │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│          Data Layer (SQLite Database)                     │
├──────────────────────────────────────────────────────────┤
│  better-sqlite3 Queries                                  │
│  - SELECT * FROM accounts WHERE user_id = ?             │
│  - INSERT INTO transactions (...)                        │
│  - UPDATE budgets SET spent = ?                          │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│         SQLite Database (fintrackr.db)                    │
├──────────────────────────────────────────────────────────┤
│  14 Tables (users, accounts, transactions, budgets, etc.)│
│  Indexes for performance                                 │
│  Foreign keys enabled                                    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     └──────────────────────────┐
                                                │
┌───────────────────────────────────────────────▼──────────┐
│            Response Handler                               │
├──────────────────────────────────────────────────────────┤
│  1. Format JSON response                                 │
│  2. Set Content-Type header                              │
│  3. Set Security headers                                 │
│  4. Send to client                                       │
└───────────────────────────────────────────────────────────┘
```

## 📁 Структура проекта

```
backend/
│
├── index.js                         # Entry point (Express сервер)
├── app.js                           # Express приложение конфиг
│
├── 📂 routes/                       # API маршруты (14 файлов)
│   ├── auth.js                      # POST /api/auth/* endpoints
│   ├── accounts.js                  # GET/POST/PUT/DELETE /api/accounts
│   ├── transactions.js              # Управление транзакциями
│   ├── budgets.js                   # Управление бюджетами
│   ├── categories.js                # Управление категориями
│   ├── goals.js                     # Финансовые цели
│   ├── subscriptions.js             # Регулярные платежи
│   ├── planned.js                   # Планируемые операции
│   ├── recurring.js                 # Рекуррентные платежи
│   ├── rules.js                     # Правила автоматизации
│   ├── analytics.js                 # Аналитика и отчеты
│   ├── currency.js                  # Конвертация валют
│   ├── twofa.js                     # Двухфакторная аутентификация
│   ├── sync.js                      # Синхронизация данных
│   └── meta.js                      # Метаинформация
│
├── 📂 middleware/                   # Middleware (7 файлов)
│   ├── auth.js                      # JWT verification & refresh
│   ├── security.js                  # Security headers (CORS, HSTS)
│   ├── csrf.js                      # CSRF token generation
│   ├── validation.js                # Input sanitization
│   ├── errorHandler.js              # Global error handler
│   ├── cache.js                     # Response caching
│   └── runner.js                    # Startup checks
│
├── 📂 services/                     # Business logic (13 файлов)
│   ├── dataService.new.js           # SQLite access layer
│   ├── authService.js               # Registration, login, tokens
│   ├── accountService.js            # Account CRUD & balance calc
│   ├── transactionService.js        # Transaction logic
│   ├── budgetService.js             # Budget calculation
│   ├── goalService.js               # Goal tracking
│   ├── currencyService.js           # Currency conversion
│   ├── reportService.js             # Report generation
│   ├── subscriptionService.js       # Subscription logic
│   ├── ruleset.js                   # Rule execution
│   ├── analysisService.js           # Trend analysis
│   ├── notificationService.js       # User notifications
│   └── syncService.js               # Data sync
│
├── 📂 utils/                        # Утилиты
│   ├── logger.js                    # Winston logger
│   ├── validation.js                # Validators
│   └── helpers.js                   # Common functions
│
├── 📂 database/                     # Database config
│   ├── init.js                      # Database initialization
│   └── migrations/                  # Schema migrations
│
├── fintrackr.db                     # SQLite database
├── fintrackr.db-shm                 # Shared memory file (SQLite)
├── fintrackr.db-wal                 # Write-ahead log (SQLite)
│
└── 📂 __tests__/                    # Backend tests (Jest)
    ├── server.test.js               # API integration tests
    ├── services/                    # Service unit tests
    └── middleware/                  # Middleware tests
```

## 🛠️ Технологический стек

| Компонент | Пакет | Версия | Назначение |
|-----------|-------|--------|-----------|
| **Runtime** | Node.js | 14+ | Серверная платформа |
| **Framework** | express | 5.x | HTTP фреймворк |
| **Database** | better-sqlite3 | 12.x | SQLite адаптер |
| **Auth** | jsonwebtoken | 9.x | JWT токены |
| **Password** | bcryptjs | 3.x | Хеширование |
| **Logger** | winston | 3.x | Логирование |
| **Validator** | joi | 18.x | Валидация |
| **Email** | nodemailer | 7.x | Email отправка |
| **Router** | express.Router | - | Модульная маршрутизация |
| **Parser** | cookie-parser | 1.x | Парсинг cookies |

## 🚀 Запуск сервера

### Инициализация базы данных

```bash
# Создать и инициализировать SQLite БД
npm run db:init

# При необходимости миграция из JSON в SQLite
npm run db:migrate
```

### Запуск сервера

```bash
# Режим разработки
npm start
# или
npm run dev

# На конкретном порту
npm run start:3000
npm run start:8080
PORT=4000 npm start

# Legacy HTTP server (без Express)
npm run start:legacy

# Production режим
NODE_ENV=production npm start
```

### Проверка статуса

```bash
# Сервер запущен успешно, если:
# ✅ 🚀 FinTrackr server running on http://localhost:3000
# ✅ ✅ Database initialized
# ✅ 🔒 Environment: development/production

# Проверить аутентификацию
curl -X GET http://localhost:3000/api/session \
  -H "Cookie: access_token=YOUR_JWT_TOKEN"

# Ответ: { "user": { "id": "...", "name": "...", "email": "..." } }
```

## 📡 Маршруты API

### Полная таблица маршрутов

#### 🔐 Аутентификация (Public)

| Метод | Endpoint | Параметры | Ответ | Статус |
|-------|----------|-----------|-------|--------|
| POST | `/api/auth/register` | name, email, password | user + tokens | 201 |
| POST | `/api/auth/login` | email, password | user + tokens | 200 |
| POST | `/api/auth/logout` | - | { success: true } | 200 |
| POST | `/api/auth/refresh` | - | { accessToken } | 200 |
| GET | `/api/session` | - | { user, token } | 200 |

#### 💳 Счета

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/accounts` | - | Account[] |
| POST | `/api/accounts` | name, currency, initialBalance | Account |
| PUT | `/api/accounts/:id` | name, balance | Account |
| DELETE | `/api/accounts/:id` | - | { success: true } |

#### 💸 Транзакции

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/transactions` | ?accountId, ?category, ?from, ?to | Transaction[] |
| POST | `/api/transactions` | accountId, type, amount, category, date | Transaction |
| PUT | `/api/transactions/:id` | amount, category, type, date | Transaction |
| DELETE | `/api/transactions/:id` | - | { success: true } |

#### 📈 Бюджеты

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/budgets` | - | Budget[] |
| POST | `/api/budgets` | categoryId, limit, month | Budget |
| DELETE | `/api/budgets/:id` | - | { success: true } |

#### 📂 Категории

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/categories` | - | Category[] |
| POST | `/api/categories` | name, icon, color | Category |
| DELETE | `/api/categories/:id` | - | { success: true } |

#### 🎯 Финансовые цели

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/goals` | - | Goal[] |
| POST | `/api/goals` | name, targetAmount, targetDate | Goal |
| PUT | `/api/goals/:id` | name, targetAmount, saved | Goal |
| DELETE | `/api/goals/:id` | - | { success: true } |

#### 📅 Подписки

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/subscriptions` | - | Subscription[] |
| POST | `/api/subscriptions` | name, amount, startDate, frequency | Subscription |
| DELETE | `/api/subscriptions/:id` | - | { success: true } |

#### 📋 Планируемые операции

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/planned` | - | PlannedOp[] |
| POST | `/api/planned` | name, amount, date, category | PlannedOp |
| DELETE | `/api/planned/:id` | - | { success: true } |

#### 🔄 Рекуррентные платежи

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/recurring` | - | Recurring[] |
| POST | `/api/recurring` | name, amount, frequency, startDate | Recurring |
| DELETE | `/api/recurring/:id` | - | { success: true } |

#### ⚙️ Правила

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/rules` | - | Rule[] |
| POST | `/api/rules` | name, conditions, actions | Rule |
| DELETE | `/api/rules/:id` | - | { success: true } |

#### 🔄 Валюты

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/currency/convert` | ?from, ?to, ?amount | { result: number } |
| GET | `/api/currency/rates` | - | RateMap |
| GET | `/api/currency/list` | - | string[] |

#### 📊 Аналитика

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| GET | `/api/analytics/summary` | - | { income, expense, balance } |
| GET | `/api/analytics/trends` | ?months=12 | { monthly: [] } |
| GET | `/api/analytics/forecast` | ?months=6 | { forecast: [] } |
| GET | `/api/analytics/reports` | - | Report[] |

#### 🔄 Синхронизация

| Метод | Endpoint | Параметры | Ответ |
|-------|----------|-----------|-------|
| POST | `/api/sync` | lastSync | { updates: {...} } |
| GET | `/api/sync/status` | - | { synced: boolean } |

## 📝 Примеры запросов/ответов

### 1. Регистрация

**Request:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Иван Петров",
  "email": "ivan@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123xyz",
    "name": "Иван Петров",
    "email": "ivan@example.com",
    "created_at": "2024-11-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies установлены:**
```
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax
```

### 2. Создание счета

**Request:**
```bash
POST /api/accounts
Authorization: Bearer <JWT_TOKEN>
Cookie: access_token=<JWT_TOKEN>
Content-Type: application/json

{
  "name": "Сбережения",
  "currency": "USD",
  "initialBalance": 5000
}
```

**Response (201):**
```json
{
  "id": "acc_def456ghi",
  "user_id": "usr_abc123xyz",
  "name": "Сбережения",
  "currency": "USD",
  "balance": 5000,
  "created_at": "2024-11-15T10:35:00Z",
  "updated_at": "2024-11-15T10:35:00Z"
}
```

### 3. Добавление транзакции

**Request:**
```bash
POST /api/transactions
Cookie: access_token=<JWT_TOKEN>
Content-Type: application/json

{
  "account_id": "acc_def456ghi",
  "type": "expense",
  "amount": 125.50,
  "category_id": "cat_xyz789",
  "description": "Продукты",
  "date": "2024-11-15"
}
```

**Response (201):**
```json
{
  "id": "tx_jkl012mno",
  "account_id": "acc_def456ghi",
  "user_id": "usr_abc123xyz",
  "type": "expense",
  "amount": 125.50,
  "currency": "USD",
  "category_id": "cat_xyz789",
  "description": "Продукты",
  "date": "2024-11-15",
  "created_at": "2024-11-15T14:20:00Z"
}
```

**Побочный эффект:** Баланс счета обновлен на 4874.50 USD

### 4. Получение списка транзакций с фильтром

**Request:**
```bash
GET /api/transactions?account_id=acc_def456ghi&from=2024-10-01&to=2024-11-30
Cookie: access_token=<JWT_TOKEN>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "tx_jkl012mno",
      "account_id": "acc_def456ghi",
      "type": "expense",
      "amount": 125.50,
      "category": "Продукты",
      "date": "2024-11-15"
    },
    {
      "id": "tx_pqr345stu",
      "account_id": "acc_def456ghi",
      "type": "income",
      "amount": 2000,
      "category": "Зарплата",
      "date": "2024-11-01"
    }
  ],
  "total": 2,
  "summary": {
    "income": 2000,
    "expense": 125.50,
    "balance": 1874.50
  }
}
```

### 5. Ошибка 401 (Unauthorized)

**Request:**
```bash
GET /api/accounts
# Без cookies
```

**Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Access token not found or invalid"
}
```

### 6. Ошибка 400 (Bad Request)

**Request:**
```bash
POST /api/accounts
Cookie: access_token=<JWT_TOKEN>
Content-Type: application/json

{
  "name": "Счет",
  # Отсутствует currency
}
```

**Response (400):**
```json
{
  "error": "Validation error",
  "details": {
    "currency": "Field 'currency' is required"
  }
}
```

## 🔌 Middleware система

### 1. Auth Middleware (auth.js)

Проверка и обновление JWT токенов

```javascript
// middleware/auth.js
const auth = (req, res, next) => {
  const token = req.cookies.access_token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Попытка обновить токен через refresh_token
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      const newToken = generateNewAccessToken(refreshToken);
      res.cookie('access_token', newToken, cookieOptions);
      req.user = jwt.decode(newToken);
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};
```

### 2. Security Middleware (security.js)

Установка security заголовков

```javascript
// middleware/security.js
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};
```

### 3. CSRF Middleware (csrf.js)

Генерация и проверка CSRF токенов

```javascript
// middleware/csrf.js
const csrf = (req, res, next) => {
  // Для GET запросов - генерировать токен
  if (req.method === 'GET') {
    const token = crypto.randomBytes(32).toString('hex');
    req.session.csrfToken = token;
    res.setHeader('X-CSRF-Token', token);
  }
  
  // Для POST/PUT/DELETE - проверять токен
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    if (token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'CSRF token mismatch' });
    }
  }
  
  next();
};
```

### 4. Validation Middleware (validation.js)

Sanitization и валидация входных данных

```javascript
// middleware/validation.js
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details 
      });
    }
    
    // Sanitize (удалить опасные символы)
    req.validated = sanitizeObject(value);
    next();
  };
};
```

### 5. Error Handler Middleware (errorHandler.js)

Глобальная обработка ошибок

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  
  // Логировать ошибку
  logger.error({
    status,
    message,
    path: req.path,
    user: req.user?.id
  });
  
  res.status(status).json({ 
    error: message,
    timestamp: new Date().toISOString()
  });
};

// Использование в app.js
app.use(errorHandler);
```

## 💾 База данных

### Схема SQLite

```sql
-- Users таблица
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts таблица
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions таблица
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT CHECK(type IN ('income', 'expense')),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  category_id TEXT,
  description TEXT,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Budgets таблица
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  limit_amount REAL NOT NULL,
  spent REAL DEFAULT 0,
  month DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Categories таблица
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Goals таблица
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  target_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subscriptions таблица
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  start_date DATE NOT NULL,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
```

### Индексы для оптимизации

```sql
-- Часто используемые запросы
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_budgets_user_month ON budgets(user_id, month);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);
```

## 🎯 Бизнес-логика модулей

### Account Service

```javascript
// services/accountService.js
class AccountService {
  // Получить все счета пользователя
  getAccounts(userId) {
    const stmt = db.prepare(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(userId);
  }

  // Создать счет
  createAccount(userId, data) {
    const id = generateId();
    const stmt = db.prepare(
      'INSERT INTO accounts (id, user_id, name, currency, balance) VALUES (?, ?, ?, ?, ?)'
    );
    
    stmt.run(id, userId, data.name, data.currency, data.initialBalance || 0);
    
    return this.getAccountById(id);
  }

  // Получить одного счета
  getAccountById(id) {
    const stmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
    return stmt.get(id);
  }

  // Обновить баланс (при добавлении транзакции)
  updateBalance(accountId, amount, operation = 'add') {
    const account = this.getAccountById(accountId);
    
    const newBalance = operation === 'add' 
      ? account.balance + amount 
      : account.balance - amount;
    
    const stmt = db.prepare('UPDATE accounts SET balance = ? WHERE id = ?');
    stmt.run(newBalance, accountId);
    
    return newBalance;
  }

  // Удалить счет (каскадное удаление транзакций)
  deleteAccount(accountId) {
    // SQLite с ON DELETE CASCADE удалит транзакции автоматически
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    stmt.run(accountId);
    
    return { success: true };
  }
}
```

### Transaction Service

```javascript
// services/transactionService.js
class TransactionService {
  // Создать транзакцию
  createTransaction(userId, data) {
    const id = generateId();
    const account = accountService.getAccountById(data.account_id);
    
    // Конвертировать сумму в валюту счета
    const amount = currencyService.convert(
      data.amount,
      data.currency || 'USD',
      account.currency
    );

    const stmt = db.prepare(
      `INSERT INTO transactions 
       (id, account_id, user_id, type, amount, currency, category_id, description, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    stmt.run(
      id, data.account_id, userId, data.type, amount, 
      account.currency, data.category_id, data.description, data.date
    );

    // Обновить баланс счета
    const operation = data.type === 'income' ? 'add' : 'subtract';
    accountService.updateBalance(data.account_id, amount, operation);

    // Обновить бюджет если это расход
    if (data.type === 'expense' && data.category_id) {
      budgetService.adjustBudgetForTransaction(
        userId, data.category_id, data.date, amount, 'add'
      );
    }

    return this.getTransactionById(id);
  }

  // Удалить транзакцию (откатить изменения)
  deleteTransaction(transactionId) {
    const tx = this.getTransactionById(transactionId);
    
    // Откатить баланс
    const operation = tx.type === 'income' ? 'subtract' : 'add';
    accountService.updateBalance(tx.account_id, tx.amount, operation);

    // Откатить бюджет
    if (tx.category_id) {
      budgetService.adjustBudgetForTransaction(
        tx.user_id, tx.category_id, tx.date, tx.amount, 'subtract'
      );
    }

    // Удалить транзакцию
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    stmt.run(transactionId);

    return { success: true };
  }

  // Получить транзакции с фильтром
  getTransactions(userId, filters = {}) {
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (filters.account_id) {
      query += ' AND account_id = ?';
      params.push(filters.account_id);
    }

    if (filters.from) {
      query += ' AND date >= ?';
      params.push(filters.from);
    }

    if (filters.to) {
      query += ' AND date <= ?';
      params.push(filters.to);
    }

    query += ' ORDER BY date DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
}
```

### Budget Service

```javascript
// services/budgetService.js
class BudgetService {
  // Получить или создать бюджет за месяц
  getBudgetForMonth(userId, categoryId, date) {
    const month = date.slice(0, 7); // YYYY-MM
    
    let stmt = db.prepare(
      'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?'
    );
    
    let budget = stmt.get(userId, categoryId, month);
    
    if (!budget) {
      // Создать бюджет с нулевым лимитом
      const id = generateId();
      stmt = db.prepare(
        `INSERT INTO budgets 
         (id, user_id, category_id, limit_amount, spent, month)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      stmt.run(id, userId, categoryId, 0, 0, month);
      budget = this.getBudgetById(id);
    }

    return budget;
  }

  // Обновить потраченную сумму
  adjustBudgetForTransaction(userId, categoryId, date, amount, operation) {
    const budget = this.getBudgetForMonth(userId, categoryId, date);
    
    const newSpent = operation === 'add'
      ? budget.spent + amount
      : Math.max(0, budget.spent - amount);

    const stmt = db.prepare('UPDATE budgets SET spent = ? WHERE id = ?');
    stmt.run(newSpent, budget.id);

    return newSpent;
  }

  // Проверить превышение лимита
  isBudgetExceeded(budgetId) {
    const budget = this.getBudgetById(budgetId);
    return budget.spent > budget.limit_amount;
  }
}
```

## ⚠️ Обработка ошибок

### Типы ошибок

```javascript
// 400 Bad Request - неправильный ввод
if (!payload.name || !payload.currency) {
  return res.status(400).json({ 
    error: 'Validation failed',
    details: { name: 'Required', currency: 'Required' }
  });
}

// 401 Unauthorized - отсутствует токен
if (!req.cookies.access_token) {
  return res.status(401).json({ error: 'Not authenticated' });
}

// 403 Forbidden - недостаточно прав
if (account.user_id !== userId) {
  return res.status(403).json({ error: 'Access denied' });
}

// 404 Not Found - ресурс не найден
if (!account) {
  return res.status(404).json({ error: 'Account not found' });
}

// 409 Conflict - конфликт (например, email уже существует)
if (existingUser) {
  return res.status(409).json({ error: 'Email already registered' });
}

// 500 Internal Server Error - ошибка на сервере
try {
  // ...
} catch (error) {
  res.status(500).json({ error: 'Internal server error' });
}
```

### Логирование ошибок

```javascript
// utils/logger.js
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Использование
logger.error('Database error', { error: err, userId: req.user?.id });
logger.warn('Rate limit exceeded', { ip: req.ip });
logger.info('User logged in', { userId: req.user.id });
```

## ⚠️ Известные проблемы

### 1. Race condition при concurrent транзакциях

**Проблема:** Два одновременных запроса могут привести к неправильному балансу

**Решение:**
```javascript
// Использовать транзакции SQLite
db.transaction(() => {
  const newBalance = accountService.updateBalance(id, amount);
  const tx = transactionService.createTransaction(userId, data);
  return { newBalance, tx };
})();
```

### 2. Производительность с большим количеством транзакций

**Проблема:** Запросы медленные при 100K+ транзакций

**Решение:**
```javascript
// Добавить индексы (выше показаны)
// Использовать пагинацию
const limit = 50;
const offset = (page - 1) * limit;

const stmt = db.prepare(
  'SELECT * FROM transactions WHERE user_id = ? LIMIT ? OFFSET ?'
);
const data = stmt.all(userId, limit, offset);
```

### 3. Утечки памяти при долгом запуске

**Проблема:** Сервер потребляет всё больше памяти

**Решение:**
```javascript
// Закрывать соединения в конце
db.close();

// Использовать connection pooling для реальной БД
// Собирать garbage collection
if (global.gc) global.gc();
```

---

**Последнее обновление:** Ноябрь 2024  
**Версия документа:** 1.0
