# 📘 FinTrackr API Guide for Frontend Developers

## Обновлённые эндпоинты аналитики (v2.0)

### Базовый URL
```
http://localhost:3000/api
```

### Аутентификация
Все эндпоинты требуют JWT cookie `access_token`. Получается через `/api/login`.

---

## 📊 Аналитика и прогнозы

### 1. GET /api/forecast
Прогноз доходов и расходов на 30 дней.

**Используется в:**
- `dashboard.js`
- `forecast.js`

**Пример запроса:**
```javascript
const forecast = await fetchData('/api/forecast');
```

**Response:**
```json
{
  "predicted_income": 5000.00,
  "predicted_expense": 3500.00,
  "days": 30,
  "confidence": "high",
  "data_points": 45
}
```

**Поля:**
- `predicted_income` - прогнозируемый доход
- `predicted_expense` - прогнозируемый расход
- `days` - период прогноза (всегда 30)
- `confidence` - уверенность: "low" | "medium" | "high"
- `data_points` - количество транзакций для расчёта

---

### 2. GET /api/analytics/categories
Разбивка расходов по категориям.

**Query params:**
- `currency` (optional) - валюта для конвертации (USD, EUR, RUB, PLN)

**Пример запроса:**
```javascript
const analysis = await fetchData('/api/analytics/categories?currency=USD');
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Продукты",
    "kind": "expense",
    "total": 12500.50,
    "count": 45,
    "average": 277.79,
    "percentage": 35.5
  },
  {
    "id": 2,
    "name": "Транспорт",
    "kind": "expense",
    "total": 5600.00,
    "count": 23,
    "average": 243.48,
    "percentage": 15.9
  }
]
```

**Использование для графиков:**
```javascript
// Для столбчатой диаграммы
const labels = analysis.map(cat => cat.name);
const values = analysis.map(cat => cat.total);
await renderBarChart('myChart', labels, values, 'USD');

// Для круговой диаграммы
await renderDonutChart('myPie', labels, values, 'USD');
```

---

### 3. GET /api/analytics/trends
Анализ трендов расходов по месяцам.

**Query params:**
- `currency` (optional) - валюта

**Пример запроса:**
```javascript
const trends = await fetchData('/api/analytics/trends?currency=USD');
```

**Response:**
```json
{
  "monthlySpending": {
    "2025-01": 3500,
    "2025-02": 3800,
    "2025-03": 4100
  },
  "months": ["2025-01", "2025-02", "2025-03"],
  "amounts": [3500, 3800, 4100],
  "average": 3800,
  "trend": 300,
  "direction": "increasing"
}
```

**Использование для линейного графика:**
```javascript
await renderLineChart(
  'trendChart',
  trends.months,
  [{ name: 'Расходы', data: trends.amounts }],
  'USD'
);
```

---

### 4. GET /api/analytics/anomalies
Обнаружение аномальных транзакций.

**Query params:**
- `currency` (optional)

**Response:**
```json
{
  "anomalies": [
    {
      "id": 123,
      "description": "Apple Store",
      "amount": 150000,
      "currency": "RUB",
      "normalizedAmount": 150000,
      "deviation": "3.45",
      "percentageAboveMean": "250.5",
      "date": "2025-03-15"
    }
  ]
}
```

**Использование:**
```javascript
const { anomalies } = await fetchData('/api/analytics/anomalies');
if (anomalies.length > 0) {
  showAlert(`Необычная транзакция: ${anomalies[0].description}`);
}
```

---

### 5. GET /api/analytics/recommendations
Рекомендации по бюджетам.

**Query params:**
- `currency` (optional)

**Response:**
```json
{
  "recommendations": [
    {
      "category_id": 1,
      "category_name": "Продукты",
      "current_average": 3500,
      "recommended_limit": 3850,
      "monthly_transactions": 42,
      "confidence": "high",
      "reasoning": "Based on average spending pattern"
    }
  ]
}
```

**Использование:**
```javascript
const { recommendations } = await fetchData('/api/analytics/recommendations');
recommendations.forEach(rec => {
  console.log(`Рекомендация для ${rec.category_name}: ${rec.recommended_limit}`);
});
```

---

### 6. GET /api/analytics/savings
Анализ потенциала экономии.

**Query params:**
- `currency` (optional)

**Response:**
```json
{
  "total_potential": 2500.00,
  "opportunities": [
    {
      "category": "Развлечения",
      "current_spending": 5000,
      "potential_savings": 1000,
      "percentage": 20,
      "confidence": "medium"
    }
  ],
  "impact": "Save up to 2500.00 USD"
}
```

**Использование:**
```javascript
const savings = await fetchData('/api/analytics/savings');
document.getElementById('savings-potential').textContent = savings.impact;
```

---

### 7. GET /api/insights
AI-powered финансовые инсайты.

**Query params:**
- `currency` (optional)

**Response:**
```json
{
  "insights": [
    {
      "type": "category",
      "priority": "high",
      "title": "Highest spending: Продукты",
      "description": "You've spent 12500.50 USD in Продукты (35.5% of total)",
      "icon": "📊",
      "action": {
        "label": "Set Budget",
        "url": "/budgets.html"
      }
    },
    {
      "type": "budget",
      "priority": "warning",
      "title": "Budget alert: Развлечения",
      "description": "You've spent 85% of your budget",
      "icon": "⚠️",
      "action": {
        "label": "View Budget",
        "url": "/budgets.html?category=5"
      }
    }
  ]
}
```

**Типы инсайтов:**
- `category` - информация о категориях расходов
- `budget` - предупреждения о бюджетах
- `savings` - возможности экономии
- `anomaly` - необычные транзакции

**Приоритеты:**
- `critical` - требует немедленного внимания
- `high` - важная информация
- `warning` - предупреждение
- `medium` - обычная информация

**Использование:**
```javascript
const { insights } = await fetchData('/api/insights');
const insightsContainer = document.getElementById('insights');

insights.forEach(insight => {
  const card = `
    <div class="insight-card priority-${insight.priority}">
      <span class="insight-icon">${insight.icon}</span>
      <div>
        <h3>${insight.title}</h3>
        <p>${insight.description}</p>
        <a href="${insight.action.url}">${insight.action.label} →</a>
      </div>
    </div>
  `;
  insightsContainer.innerHTML += card;
});
```

---

## 💡 Примеры интеграции

### Dashboard - AI Прогноз
```javascript
async function loadForecast() {
  try {
    const forecast = await fetchData('/api/forecast');
    const currency = getBalanceCurrency();
    
    document.getElementById('aiIncome').textContent = 
      forecast.predicted_income.toFixed(2);
    document.getElementById('aiExpense').textContent = 
      forecast.predicted_expense.toFixed(2);
    
    // Показать уверенность
    const confidenceBadge = document.querySelector('.confidence-badge');
    confidenceBadge.textContent = forecast.confidence.toUpperCase();
    confidenceBadge.className = `confidence-badge confidence-${forecast.confidence}`;
  } catch (error) {
    console.error('Forecast error:', error);
  }
}
```

### Reports - Графики категорий
```javascript
async function generateCategoryChart() {
  const currency = getReportCurrency();
  const analysis = await fetchData(`/api/analytics/categories?currency=${currency}`);
  
  if (analysis.length === 0) {
    showEmptyState('Нет данных для отчёта');
    return;
  }
  
  // Топ 8 + остальные
  const top8 = analysis.slice(0, 8);
  const other = analysis.slice(8).reduce((sum, cat) => sum + cat.total, 0);
  
  const labels = top8.map(cat => cat.name);
  const values = top8.map(cat => cat.total);
  
  if (other > 0) {
    labels.push('Другие');
    values.push(other);
  }
  
  await renderBarChart('reportChart', labels, values, currency);
  await renderDonutChart('reportPie', labels, values, currency);
}
```

### Insights Widget
```javascript
async function loadInsights() {
  const { insights } = await fetchData('/api/insights');
  const container = document.getElementById('insights-widget');
  
  if (insights.length === 0) {
    container.innerHTML = '<p>Нет новых инсайтов</p>';
    return;
  }
  
  // Показать только топ-3 критичных
  const critical = insights
    .filter(i => ['critical', 'high'].includes(i.priority))
    .slice(0, 3);
  
  container.innerHTML = critical.map(insight => `
    <div class="alert-banner alert-banner--${insight.priority}">
      <span>${insight.icon}</span>
      <div>
        <p class="alert-banner-title">${insight.title}</p>
        <p class="alert-banner-text">${insight.description}</p>
      </div>
      <a href="${insight.action.url}" class="btn-secondary btn-pill">
        ${insight.action.label}
      </a>
    </div>
  `).join('');
}
```

---

## 🔄 Миграция с существующего кода

### До (старый способ - ручная группировка)
```javascript
const transactions = await fetchData('/api/transactions');
const categories = await fetchData('/api/categories');

const expenseMap = new Map();
transactions.forEach(tx => {
  if (tx.type === 'expense') {
    const cat = categories.find(c => c.id === tx.category_id);
    const key = cat ? cat.name : 'Неизвестно';
    const prev = expenseMap.get(key) || 0;
    expenseMap.set(key, prev + Number(tx.amount));
  }
});

const labels = Array.from(expenseMap.keys());
const values = Array.from(expenseMap.values());
```

### После (новый способ - использование API)
```javascript
const analysis = await fetchData('/api/analytics/categories?currency=USD');
const labels = analysis.map(cat => cat.name);
const values = analysis.map(cat => cat.total);
```

**Преимущества:**
- ✅ Меньше кода на фронтенде
- ✅ Валютная конвертация на бекэнде
- ✅ Дополнительные метрики (average, percentage, count)
- ✅ Единая точка логики

---

## 🛠️ Утилиты

### Хелпер для валюты
```javascript
// frontend/modules/api.js
export async function fetchAnalytics(endpoint, currency) {
  const settings = loadProfileSettings();
  const curr = currency || settings.reportCurrency || 'USD';
  return fetchData(`/api/analytics/${endpoint}?currency=${curr}`);
}

// Использование
const categories = await fetchAnalytics('categories', 'USD');
const trends = await fetchAnalytics('trends', 'EUR');
```

### Хелпер для обработки ошибок
```javascript
async function safeAnalyticsRequest(endpoint, fallback = null) {
  try {
    return await fetchData(endpoint);
  } catch (error) {
    console.error(`Analytics error for ${endpoint}:`, error);
    return fallback;
  }
}

// Использование
const forecast = await safeAnalyticsRequest('/api/forecast', {
  predicted_income: 0,
  predicted_expense: 0,
  confidence: 'low'
});
```

---

## 📚 Дополнительные ресурсы

- **ApexCharts документация:** https://apexcharts.com/docs/
- **Charts usage guide:** `docs/charts_usage_guide.md`
- **Backend update summary:** `BACKEND_UPDATE_SUMMARY.md`
- **Analytics service:** `backend/services/analyticsService.js`

---

**Последнее обновление:** 2025-01-16  
**API версия:** v2.0
