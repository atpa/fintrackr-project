# 🎨 FinTrackr Frontend — Документация

Полное руководство по архитектуре фронтенда, стеку технологий, компонентам и API-взаимодействию.

## 📋 Содержание

1. [Стек фронтенда](#стек-фронтенда)
2. [Архитектура директорий](#архитектура-директорий)
3. [Жизненный цикл страниц](#жизненный-цикл-страниц)
4. [Модули и компоненты](#модули-и-компоненты)
5. [API-взаимодействие](#api-взаимодействие)
6. [Графики и визуализация](#графики-и-визуализация)
7. [PWA интеграция](#pwa-интеграция)
8. [Стилизация и темы](#стилизация-и-темы)
9. [Известные проблемы](#известные-проблемы)

## 🛠️ Стек фронтенда

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| **HTML5** | - | Семантическая разметка, доступность |
| **CSS3** | - | Grid, Flexbox, переменные, анимации |
| **JavaScript ES6+** | - | ES6 модули, async/await, Fetch API |
| **Vite** | ^6.4.1 | Сборка и оптимизация бандлов |
| **ApexCharts** | ^4.x | Интерактивные графики и диаграммы |
| **Service Worker API** | - | Offline режим, кэширование |
| **IndexedDB** | - | Локальное хранилище данных |

### Отсутствующие фреймворки (намеренно)

- ❌ React / Vue / Angular — используется ванильный JS для минимальной зависимости
- ❌ Webpack — используется Vite для быстрой сборки
- ❌ jQuery — используется современный Fetch API

## 📁 Архитектура директорий

```
frontend/
├── pages/                           # Модули страниц (компилируются в public/js)
│   ├── dashboard.js                 # Главный дашборд
│   ├── accounts.js                  # Управление счетами
│   ├── transactions.js              # Список и управление транзакциями
│   ├── budgets.js                   # Бюджеты по категориям
│   ├── goals.js                     # Финансовые цели
│   ├── subscriptions.js             # Регулярные платежи
│   ├── planned.js                   # Планируемые операции
│   ├── recurring.js                 # Рекуррентные платежи
│   ├── rules.js                     # Правила автоматизации
│   ├── reports.js                   # Отчеты и аналитика
│   ├── sync.js                      # Синхронизация данных
│   ├── settings.js                  # Настройки пользователя
│   ├── converter.js                 # Конвертер валют
│   └── forecast.js                  # Прогноз расходов (ML)
│
├── modules/                         # Переиспользуемые модули (общие)
│   ├── auth.js                      # Управление аутентификацией
│   ├── api.js                       # HTTP клиент (fetch обертка)
│   ├── navigation.js                # Боковая панель и маршрутизация
│   ├── profile.js                   # Профиль и настройки пользователя
│   ├── currency.js                  # Конвертация валют
│   ├── validation.js                # Client-side валидация
│   ├── storage.js                   # LocalStorage и IndexedDB
│   └── notifications.js             # Уведомления пользователю
│
└── components/                      # UI компоненты (опционально)
    ├── Header.js
    ├── Card.js
    └── ...
```

### Статические файлы (public/)

```
public/
├── js/                              # Собранные Vite бандлы
│   ├── dashboard.js                 # Скомпилированный dashboard.js
│   ├── accounts.js                  # Скомпилированный accounts.js
│   ├── modules/                     # Общие модули
│   │   ├── auth.js
│   │   ├── api.js
│   │   └── navigation.js
│   └── ...                          # Остальные страницы
│
├── css/                             # Стили
│   └── style.css                    # Единый файл стилей (2200+ строк)
│
├── icons/                           # SVG иконки
│   ├── arrow.svg, check.svg
│   ├── menu.svg, close.svg
│   └── ...
│
├── images/                          # Изображения
│   └── logo.png, placeholder.jpg
│
├── html/                            # HTML страницы
│   ├── login.html                   # Вход (public)
│   ├── register.html                # Регистрация (public)
│   ├── dashboard.html               # Главная (protected)
│   ├── accounts.html                # Счета
│   ├── transactions.html            # Транзакции
│   ├── budgets.html                 # Бюджеты
│   ├── goals.html                   # Цели
│   ├── subscriptions.html           # Подписки
│   ├── reports.html                 # Отчеты
│   └── ...                          # Остальные страницы
│
├── manifest.json                    # PWA манифест
├── sw.js                            # Service Worker
└── offline.html                     # Offline страница
```

## 🔄 Жизненный цикл страниц

### 1. Инициализация при загрузке HTML

```javascript
// Пример: frontend/pages/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
  // Шаг 1: Проверка аутентификации
  const user = Auth.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Шаг 2: Инициализация навигации (sidebar)
  await initNavigation();

  // Шаг 3: Загрузка данных
  const accounts = await api.fetchData('/api/accounts');
  const transactions = await api.fetchData('/api/transactions');

  // Шаг 4: Рендеринг UI
  renderDashboard(accounts, transactions);

  // Шаг 5: Привязка событий
  attachEventListeners();

  // Шаг 6: Запуск фоновых процессов
  startAutoRefresh();
});
```

### 2. Загрузка и кэширование данных

```javascript
// api.js - HTTP клиент с автоматической обработкой ошибок
const api = {
  async fetchData(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        credentials: 'include',    // Отправлять cookies
        headers: {
          'Content-Type': 'application/json'
        },
        ...options
      });

      if (response.status === 401) {
        Auth.logout();
        throw new Error('Не авторизован');
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();

    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      showNotification(`Ошибка: ${error.message}`, 'error');
      throw error;
    }
  }
};
```

### 3. Обновление данных (Real-time)

```javascript
// Периодическая синхронизация (каждые 30 сек)
function startAutoRefresh() {
  setInterval(async () => {
    try {
      const fresh = await api.fetchData('/api/accounts');
      if (isDataChanged(fresh, currentData)) {
        currentData = fresh;
        updateUI();
      }
    } catch (error) {
      console.warn('Auto-refresh failed:', error);
    }
  }, 30000);
}
```

### 4. События и обработчики

```javascript
// Примеры event listeners
function attachEventListeners() {
  // Кнопки действий
  document.querySelector('#addAccountBtn').addEventListener('click', showAddAccountModal);
  
  // Формы
  document.querySelector('#accountForm').addEventListener('submit', handleAccountSubmit);
  
  // Фильтры и поиск
  document.querySelector('#transactionFilter').addEventListener('change', filterTransactions);
  
  // Делегирование событий (для динамических элементов)
  document.addEventListener('click', (e) => {
    if (e.target.matches('.delete-btn')) handleDelete(e.target);
    if (e.target.matches('.edit-btn')) handleEdit(e.target);
  });
}
```

### 5. Рендеринг элементов

```javascript
// Динамическое создание HTML
function renderAccounts(accounts) {
  const container = document.getElementById('accountsList');
  
  const html = accounts.map(acc => `
    <div class="account-card" data-id="${acc.id}">
      <h3>${acc.name}</h3>
      <p>${acc.balance.toFixed(2)} ${acc.currency}</p>
      <button class="edit-btn" data-id="${acc.id}">Редактировать</button>
      <button class="delete-btn" data-id="${acc.id}">Удалить</button>
    </div>
  `).join('');
  
  container.innerHTML = html;
}
```

## 🧩 Модули и компоненты

### Модуль Auth — Управление аутентификацией

```javascript
// frontend/modules/auth.js
const Auth = {
  // Сохранить данные пользователя
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Получить текущего пользователя
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Проверка авторизации
  isLoggedIn() {
    return !!this.getUser();
  },

  // Выход из системы
  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }
};

// Использование:
if (!Auth.isLoggedIn()) {
  window.location.href = '/login.html';
}
```

### Модуль API — HTTP клиент

```javascript
// frontend/modules/api.js
const api = {
  async fetchData(endpoint, options = {}) {
    const response = await fetch(endpoint, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      ...options
    });

    if (response.status === 401) {
      Auth.logout();
      return null;
    }

    return response.json();
  },

  async post(endpoint, data) {
    return this.fetchData(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async put(endpoint, data) {
    return this.fetchData(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(endpoint) {
    return this.fetchData(endpoint, {
      method: 'DELETE'
    });
  }
};
```

### Модуль Navigation — Боковая панель

```javascript
// frontend/modules/navigation.js
async function initNavigation() {
  const user = Auth.getUser();
  const sidebar = document.querySelector('nav');

  sidebar.innerHTML = `
    <div class="nav-header">
      <h2>FinTrackr</h2>
    </div>
    <ul class="nav-menu">
      <li><a href="/dashboard.html">Дашборд</a></li>
      <li><a href="/accounts.html">Счета</a></li>
      <li><a href="/transactions.html">Транзакции</a></li>
      <li><a href="/budgets.html">Бюджеты</a></li>
      <li><a href="/goals.html">Цели</a></li>
      <li><a href="/subscriptions.html">Подписки</a></li>
      <li><a href="/reports.html">Отчеты</a></li>
      <li><a href="/settings.html">Настройки</a></li>
    </ul>
    <div class="nav-footer">
      <p>${user?.name || 'Пользователь'}</p>
      <button id="logoutBtn">Выход</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api.post('/api/auth/logout');
    Auth.logout();
  });
}
```

### Модуль Profile — Настройки пользователя

```javascript
// frontend/modules/profile.js
const Profile = {
  // Получить предпочтения
  getTheme() {
    return localStorage.getItem('theme') || 'light';
  },

  // Установить тему
  setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  // Валюта по умолчанию
  getDefaultCurrency() {
    return localStorage.getItem('defaultCurrency') || 'USD';
  },

  setDefaultCurrency(currency) {
    localStorage.setItem('defaultCurrency', currency);
  }
};

// Использование:
Profile.setTheme('dark');
document.documentElement.setAttribute('data-theme', Profile.getTheme());
```

### Модуль Currency — Конвертация валют

```javascript
// frontend/modules/currency.js
const RATE_MAP = {
  USD: { USD: 1, EUR: 0.94, PLN: 4.5, RUB: 90 },
  EUR: { USD: 1.06, EUR: 1, PLN: 4.8, RUB: 95 },
  PLN: { USD: 0.22, EUR: 0.21, PLN: 1, RUB: 20 },
  RUB: { USD: 0.011, EUR: 0.0105, PLN: 0.05, RUB: 1 }
};

const Currency = {
  convert(amount, from, to) {
    if (from === to) return amount;
    return (amount * RATE_MAP[from][to]).toFixed(2);
  },

  getRate(from, to) {
    return RATE_MAP[from]?.[to] || 1;
  },

  supportedCurrencies() {
    return Object.keys(RATE_MAP);
  }
};
```

## 🌐 API-взаимодействие

### Cookies и аутентификация

Все API запросы должны отправлять cookies:

```javascript
fetch(endpoint, {
  credentials: 'include',      // ✅ Включить cookies
  headers: {
    'Content-Type': 'application/json'
  }
});
```

**Cookie атрибуты (сервер):**
- `HttpOnly` — недоступна для JS (защита от XSS)
- `Secure` — отправляется только по HTTPS
- `SameSite=Lax` — защита от CSRF атак

### CSRF Protection

Формы могут отправлять CSRF токен в заголовке:

```javascript
// Получить CSRF токен из заголовка ответа
let csrfToken = null;

fetch('/api/session', { credentials: 'include' })
  .then(res => {
    csrfToken = res.headers.get('X-CSRF-Token');
    return res.json();
  });

// Использовать при POST/PUT/DELETE
fetch('/api/accounts', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### Примеры запросов

**Получить список счетов:**
```javascript
const accounts = await api.fetchData('/api/accounts');
// Ответ: [{ id, name, currency, balance, user_id, created_at }, ...]
```

**Создать новый счет:**
```javascript
const newAccount = await api.post('/api/accounts', {
  name: 'Сбережения',
  currency: 'USD',
  initialBalance: 1000
});
// Ответ: { id, name, currency, balance, ... }
```

**Обновить счет:**
```javascript
await api.put('/api/accounts/123', {
  name: 'Мой счет',
  balance: 1500
});
```

**Удалить счет:**
```javascript
await api.delete('/api/accounts/123');
// Ответ: { success: true }
```

### Обработка ошибок

```javascript
try {
  const data = await api.fetchData('/api/accounts');
} catch (error) {
  if (error.message.includes('401')) {
    Auth.logout();
  } else if (error.message.includes('403')) {
    showNotification('Доступ запрещен', 'error');
  } else if (error.message.includes('404')) {
    showNotification('Ресурс не найден', 'error');
  } else {
    showNotification(`Ошибка: ${error.message}`, 'error');
  }
}
```

## 📊 Графики и визуализация

### ApexCharts интеграция

```javascript
// Пример: График расходов по месяцам
function renderExpenseChart(data) {
  const options = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: true }
    },
    xaxis: {
      categories: data.months // ['Jan', 'Feb', 'Mar', ...]
    },
    yaxis: {
      title: { text: 'Расходы (USD)' }
    },
    series: [{
      name: 'Расходы',
      data: data.expenses // [1200, 1500, 1100, ...]
    }],
    stroke: { curve: 'smooth' }
  };

  const chart = new ApexCharts(
    document.getElementById('expenseChart'),
    options
  );
  chart.render();
}
```

### Типы графиков в FinTrackr

| Тип | Использование | Пример |
|-----|---------------|--------|
| **Line Chart** | Тренды доходов/расходов | График расходов за 12 месяцев |
| **Bar Chart** | Сравнение категорий | Расходы по категориям в месяц |
| **Pie Chart** | Распределение | Процент расходов по категориям |
| **Area Chart** | Накопление | Баланс счетов во времени |
| **Combo Chart** | Множественные данные | Доход vs Расход vs Баланс |

### Dashboard графики

```javascript
// dashboard.js - Главные графики
document.addEventListener('DOMContentLoaded', async () => {
  const data = await api.fetchData('/api/analytics/summary');
  
  // 1. Баланс по счетам (Pie)
  renderBalanceChart(data.accounts);
  
  // 2. Доход vs Расход (Bar)
  renderIncomeExpenseChart(data.monthlyStats);
  
  // 3. Тренд расходов (Line)
  renderExpenseTrendChart(data.trends);
  
  // 4. Категории (Bar)
  renderCategoriesChart(data.categories);
});
```

## 🛜 PWA интеграция

### Manifest.json

```json
{
  "name": "FinTrackr - Personal Finance Tracker",
  "short_name": "FinTrackr",
  "description": "Управление личными финансами",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (sw.js)

```javascript
// public/sw.js - Офлайн режим и кэширование

const CACHE_NAME = 'fintrackr-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/dashboard.js',
  '/offline.html'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Активация и очистка старого кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегия кэширования: Cache first, fallback to network
self.addEventListener('fetch', (event) => {
  // Не кэшировать API запросы
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // Кэшировать статические файлы
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('/offline.html'))
  );
});
```

### Регистрация Service Worker

```javascript
// В главном HTML файле
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('✅ Service Worker registered'))
    .catch(err => console.error('❌ Service Worker registration failed:', err));
}
```

## 🎨 Стилизация и темы

### CSS архитектура

Главный файл: `public/css/style.css` (~2200 строк)

```css
/* 1. CSS Переменные (Themes) */
:root {
  /* Light theme */
  --primary-color: #6366f1;
  --accent-color: #06b6d4;
  --bg-color: #ffffff;
  --text-color: #1f2937;
  --border-color: #e5e7eb;
}

html[data-theme="dark"] {
  --primary-color: #818cf8;
  --accent-color: #06b6d4;
  --bg-color: #111827;
  --text-color: #f3f4f6;
  --border-color: #374151;
}

/* 2. Layout базовый */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: background-color 0.3s ease;
}

/* 3. Grid система */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* 4. Компоненты */
.card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: var(--accent-color);
}
```

### Переключение темы

```javascript
// Функция переключения темы
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  
  // Уведомить пользователя
  showNotification(`Тема изменена на ${next === 'dark' ? 'темную' : 'светлую'}`);
}

// При загрузке страницы восстановить тему
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
```

## ⚠️ Известные проблемы

### 1. CORS при локальном тестировании

**Проблема:** Ошибка "No 'Access-Control-Allow-Origin' header"

**Решение:**
```javascript
// Backend должен включать CORS для frontend домена
// backend/middleware/security.js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
```

### 2. Service Worker кэширует устаревший код

**Проблема:** После обновления кода браузер показывает старую версию

**Решение:**
```javascript
// Добавить версию в кэш
const CACHE_NAME = `fintrackr-v${VERSION}`;

// Очистить старый кэш при обновлении
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  caches.delete(`fintrackr-v${OLD_VERSION}`);
}
```

### 3. IndexedDB и большие объемы данных

**Проблема:** Медленная загрузка больших наборов данных

**Решение:**
```javascript
// Использовать пагинацию и ленивую загрузку
const pageSize = 50;
let offset = 0;

async function loadMoreTransactions() {
  const data = await api.fetchData(
    `/api/transactions?limit=${pageSize}&offset=${offset}`
  );
  offset += pageSize;
  renderTransactions(data);
}

// Бесконечная прокрутка
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    loadMoreTransactions();
  }
});
```

### 4. Cookies не сохраняются при HTTPS

**Проблема:** Cookies теряются после перезагрузки на HTTPS

**Решение:**
```javascript
// В .env установить для production
COOKIE_SECURE=true              # Только HTTPS
COOKIE_SAMESITE=Strict         # Максимум защиты
```

### 5. Производительность при 10000+ транзакций

**Проблема:** Страница становится медленной с большим количеством данных

**Решение:**
```javascript
// Использовать виртуализацию (virtual scrolling)
// Рендерить только видимые элементы

function renderVirtualList(data, containerHeight = 600) {
  const itemHeight = 50;
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  
  // Рендерить только видимые + буфер
  const visibleData = data.slice(0, visibleItems + 10);
  renderTransactions(visibleData);
  
  // При скролле обновлять
  container.addEventListener('scroll', () => {
    const scrollTop = container.scrollTop;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const newData = data.slice(startIndex, startIndex + visibleItems);
    updateVisibleItems(newData);
  });
}
```

## 🚀 Рекомендации по оптимизации

### 1. Минимизация API запросов
```javascript
// ❌ Плохо - 10 отдельных запросов
for (let account of accounts) {
  const transactions = await api.fetchData(`/api/transactions?account=${account.id}`);
}

// ✅ Хорошо - 1 запрос за раз
const allTransactions = await api.fetchData('/api/transactions?accounts=1,2,3');
```

### 2. Кэширование данных в памяти
```javascript
// Кэш с TTL (Time To Live)
class Cache {
  constructor(ttl = 60000) {
    this.data = {};
    this.ttl = ttl;
  }

  set(key, value) {
    this.data[key] = { value, expires: Date.now() + this.ttl };
  }

  get(key) {
    const item = this.data[key];
    if (!item) return null;
    if (Date.now() > item.expires) {
      delete this.data[key];
      return null;
    }
    return item.value;
  }
}

const cache = new Cache();
```

### 3. Debouncing для обработчиков событий
```javascript
// Debounce для фильтра поиска
function debounce(func, wait) {
  let timeout;
  return function execFunc(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const handleSearch = debounce(async (query) => {
  const results = await api.fetchData(`/api/transactions?search=${query}`);
  renderResults(results);
}, 300);

searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
```

---

**Последнее обновление:** Ноябрь 2024  
**Версия документа:** 1.0
