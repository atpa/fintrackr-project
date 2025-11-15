# 🚀 FinTrackr Implementation Guide

## Quick Start: Integrating New Features

This guide shows you how to integrate the newly created services and modules into your FinTrackr application.

---

## 1. Backend: Adding Analytics Endpoints

### Step 1: Import Services in server.js

Add these imports at the top of `backend/server.js`:

```javascript
const analyticsService = require('./services/analyticsService');
const categorizationService = require('./services/categorizationService');
const { securityHeaders, rateLimit } = require('./middleware/security');
const { errorHandler } = require('./middleware/errorHandler');
```

### Step 2: Add Analytics Endpoints

Add these endpoints to the `handleApi` function in `server.js`:

```javascript
// Analytics endpoints
if (url.pathname === '/api/analytics/trends' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const currency = url.searchParams.get('currency') || 'USD';
  
  const trends = analyticsService.analyzeSpendingTrends(
    userTransactions, 
    currency, 
    convertAmount
  );
  
  return sendJson(res, trends);
}

if (url.pathname === '/api/analytics/forecast' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const monthsAhead = parseInt(url.searchParams.get('months') || '3');
  const currency = url.searchParams.get('currency') || 'USD';
  
  const forecast = analyticsService.forecastSpending(
    userTransactions,
    monthsAhead,
    currency,
    convertAmount
  );
  
  return sendJson(res, forecast);
}

if (url.pathname === '/api/analytics/by-category' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const userCategories = filterForUser(data.categories);
  const currency = url.searchParams.get('currency') || 'USD';
  
  const analysis = analyticsService.analyzeByCategory(
    userTransactions,
    userCategories,
    currency,
    convertAmount
  );
  
  return sendJson(res, analysis);
}

if (url.pathname === '/api/analytics/anomalies' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const currency = url.searchParams.get('currency') || 'USD';
  
  const anomalies = analyticsService.detectAnomalies(
    userTransactions,
    currency,
    convertAmount
  );
  
  return sendJson(res, anomalies);
}

if (url.pathname === '/api/analytics/budget-recommendations' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const userCategories = filterForUser(data.categories);
  const currency = url.searchParams.get('currency') || 'USD';
  
  const recommendations = analyticsService.generateBudgetRecommendations(
    userTransactions,
    userCategories,
    currency,
    convertAmount
  );
  
  return sendJson(res, recommendations);
}

if (url.pathname === '/api/analytics/savings' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const userCategories = filterForUser(data.categories);
  const currency = url.searchParams.get('currency') || 'USD';
  
  const savings = analyticsService.analyzeSavingsPotential(
    userTransactions,
    userCategories,
    currency,
    convertAmount
  );
  
  return sendJson(res, savings);
}
```

### Step 3: Add Categorization Endpoints

```javascript
// Categorization endpoints
if (url.pathname === '/api/categorize/transaction' && req.method === 'POST') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const { description } = await parseBody(req);
  const userCategories = filterForUser(data.categories);
  const userRules = filterForUser(data.rules || []);
  
  const result = categorizationService.categorizeTransaction(
    description,
    userCategories,
    userRules
  );
  
  return sendJson(res, result || { error: 'No category match found' }, result ? 200 : 404);
}

if (url.pathname === '/api/categorize/batch' && req.method === 'POST') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const { transaction_ids } = await parseBody(req);
  const userCategories = filterForUser(data.categories);
  const userRules = filterForUser(data.rules || []);
  
  const transactions = data.transactions.filter(t => 
    transaction_ids.includes(t.id) && t.user_id === userId
  );
  
  const results = categorizationService.batchCategorize(
    transactions,
    userCategories,
    userRules
  );
  
  return sendJson(res, results);
}

if (url.pathname === '/api/categorize/stats' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const userCategories = filterForUser(data.categories);
  const userRules = filterForUser(data.rules || []);
  
  const stats = categorizationService.getCategorizationStatistics(
    userTransactions,
    userCategories,
    userRules
  );
  
  return sendJson(res, stats);
}
```

### Step 4: Add Insights Endpoint

```javascript
if (url.pathname === '/api/insights' && req.method === 'GET') {
  const auth = requireAuth(req, res);
  if (!auth) return;
  
  const userTransactions = filterForUser(data.transactions);
  const userBudgets = filterForUser(data.budgets);
  const userGoals = filterForUser(data.goals);
  const userAccounts = filterForUser(data.accounts);
  
  // This would use the insights module - for now, return placeholder
  return sendJson(res, {
    transactions: userTransactions.length,
    budgets: userBudgets.length,
    goals: userGoals.length,
    accounts: userAccounts.length,
    message: 'Insights generation - integrate frontend module'
  });
}
```

---

## 2. Frontend: Adding Toast Notifications

### Step 1: Update HTML Files

Add toast notification import to your HTML files (e.g., `dashboard.html`):

```html
<script type="module">
  import toast from './js/utils/toast.js';
  
  // Make available globally
  window.toast = toast;
</script>
```

### Step 2: Replace alert() Calls

Replace old `alert()` calls with toast notifications:

**Before:**
```javascript
alert('Transaction created successfully!');
```

**After:**
```javascript
toast.success('Transaction created successfully!');
```

**Error handling:**
```javascript
try {
  await createTransaction(data);
  toast.success('Transaction created!');
} catch (error) {
  toast.error('Failed to create transaction: ' + error.message);
}
```

**With action button:**
```javascript
toast.info('New feature available!', {
  action: {
    text: 'Learn More',
    callback: () => {
      window.location.href = '/features.html';
    }
  }
});
```

---

## 3. Frontend: Adding Loading Skeletons

### Step 1: Import Skeleton Module

```html
<script type="module">
  import skeleton, { withSkeleton } from './js/utils/skeleton.js';
  
  window.skeleton = skeleton;
  window.withSkeleton = withSkeleton;
</script>
```

### Step 2: Add Skeletons to Data Loading

**Manual control:**
```javascript
async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  
  // Show skeleton
  skeleton.show(container, 'dashboard');
  
  try {
    const data = await fetchData('/api/dashboard');
    // Render data
    container.innerHTML = renderDashboard(data);
  } catch (error) {
    toast.error('Failed to load dashboard');
  } finally {
    // skeleton.hide() is implicit when you set innerHTML
  }
}
```

**Automatic with withSkeleton:**
```javascript
async function loadTransactions() {
  await withSkeleton({
    container: '#transactions-list',
    type: 'transaction',
    options: { items: 5 }
  }, async () => {
    const transactions = await fetchData('/api/transactions');
    document.getElementById('transactions-list').innerHTML = renderTransactions(transactions);
  });
}
```

---

## 4. Frontend: Adding Insights Widget

### Create Insights Widget Component

Create a new file `public/js/insights-widget.js`:

```javascript
import toast from './utils/toast.js';
import { generateInsights, formatInsight } from '../frontend/modules/insights.js';

export async function loadInsightsWidget() {
  const container = document.getElementById('insights-widget');
  if (!container) return;
  
  try {
    // Fetch data
    const [transactions, budgets, goals, accounts] = await Promise.all([
      fetch('/api/transactions').then(r => r.json()),
      fetch('/api/budgets').then(r => r.json()),
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json())
    ]);
    
    // Generate insights
    const insights = generateInsights({
      transactions,
      budgets,
      goals,
      accounts
    });
    
    // Render
    container.innerHTML = renderInsights(insights);
  } catch (error) {
    console.error('Failed to load insights:', error);
    toast.error('Failed to load insights');
  }
}

function renderInsights(insights) {
  if (insights.length === 0) {
    return '<p class="text-muted">Нет новых инсайтов</p>';
  }
  
  return `
    <div class="insights-list">
      ${insights.map(insight => {
        const formatted = formatInsight(insight);
        return `
          <div class="insight-card insight-${insight.type}">
            <div class="insight-icon">${formatted.icon}</div>
            <div class="insight-content">
              <h4 class="insight-title">${insight.title}</h4>
              <p class="insight-message">${insight.message}</p>
              ${insight.action ? `
                <a href="${insight.action.url}" class="insight-action">
                  ${insight.action.label} →
                </a>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
```

### Add Widget to Dashboard

In `dashboard.html`, add the insights widget container:

```html
<section class="insights-section">
  <h2>Insights & Recommendations</h2>
  <div id="insights-widget"></div>
</section>

<script type="module">
  import { loadInsightsWidget } from './js/insights-widget.js';
  
  document.addEventListener('DOMContentLoaded', () => {
    loadInsightsWidget();
  });
</script>
```

---

## 5. Security: Adding Middleware

### Apply Security Middleware

Wrap your server creation with middleware:

```javascript
const { securityHeaders, rateLimit, sanitizeInput } = require('./middleware/security');

function createServerWithMiddleware() {
  const baseServer = http.createServer((req, res) => {
    // Apply middleware chain
    const middleware = [
      securityHeaders,
      rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
      sanitizeInput
    ];
    
    let index = 0;
    
    function next() {
      if (index >= middleware.length) {
        // All middleware done, handle request
        return handleRequest(req, res);
      }
      
      const fn = middleware[index++];
      fn(req, res, next);
    }
    
    next();
  });
  
  return baseServer;
}

// Original request handler
function handleRequest(req, res) {
  if (req.url.startsWith('/api/')) {
    return handleApi(req, res);
  }
  return handleStatic(req, res);
}
```

---

## 6. Testing: Add Tests for New Services

### Analytics Service Tests

Create `backend/__tests__/analyticsService.test.js`:

```javascript
const analyticsService = require('../services/analyticsService');

describe('Analytics Service', () => {
  const mockTransactions = [
    { type: 'expense', amount: 100, currency: 'USD', date: '2025-01-15' },
    { type: 'expense', amount: 150, currency: 'USD', date: '2025-02-15' },
    { type: 'expense', amount: 200, currency: 'USD', date: '2025-03-15' }
  ];
  
  const mockCategories = [
    { id: 1, name: 'Groceries', kind: 'expense' }
  ];
  
  const convertAmount = (amount, from, to) => amount;
  
  test('analyzeSpendingTrends calculates trends correctly', () => {
    const result = analyticsService.analyzeSpendingTrends(
      mockTransactions, 
      'USD', 
      convertAmount
    );
    
    expect(result).toHaveProperty('monthlySpending');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('direction');
    expect(result.direction).toBe('increasing');
  });
  
  test('forecastSpending returns predictions', () => {
    const result = analyticsService.forecastSpending(
      mockTransactions,
      3,
      'USD',
      convertAmount
    );
    
    expect(result).toHaveProperty('forecast');
    expect(result.forecast).toHaveLength(3);
    expect(result.forecast[0]).toHaveProperty('predicted');
    expect(result.forecast[0]).toHaveProperty('confidence');
  });
  
  test('detectAnomalies identifies outliers', () => {
    const transactions = [
      ...mockTransactions,
      { type: 'expense', amount: 1000, currency: 'USD', date: '2025-04-15' }
    ];
    
    const result = analyticsService.detectAnomalies(
      transactions,
      'USD',
      convertAmount
    );
    
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].amount).toBe(1000);
  });
});
```

---

## 7. Deployment Checklist

### Before Deployment

- [ ] Run all tests: `npm run test:backend`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Run linter: `npm run lint`
- [ ] Build frontend: `npx vite build` (if using Vite)
- [ ] Set production environment variables:
  - [ ] `JWT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
  - [ ] `NODE_ENV=production`
  - [ ] `COOKIE_SECURE=true`
  - [ ] `PORT=3000`

### Post-Deployment

- [ ] Test PWA installation
- [ ] Verify Service Worker is active
- [ ] Test offline functionality
- [ ] Check analytics endpoints
- [ ] Verify rate limiting works
- [ ] Test toast notifications
- [ ] Verify security headers are set

---

## 8. Performance Optimization

### Frontend Optimization

1. **Lazy Load Modules**
```javascript
// Instead of importing all modules upfront
// Import on demand
async function showAnalytics() {
  const analyticsModule = await import('./modules/analytics.js');
  analyticsModule.initialize();
}
```

2. **Debounce API Calls**
```javascript
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const searchTransactions = debounce(async (query) => {
  const results = await fetch(`/api/transactions?search=${query}`);
  // ... render results
}, 300);
```

3. **Cache API Responses**
```javascript
const cache = new Map();

async function fetchWithCache(url, maxAge = 60000) {
  if (cache.has(url)) {
    const { data, timestamp } = cache.get(url);
    if (Date.now() - timestamp < maxAge) {
      return data;
    }
  }
  
  const data = await fetch(url).then(r => r.json());
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### Backend Optimization

1. **Enable Compression**
```javascript
const zlib = require('zlib');

function compress(data) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(data)));
}

function sendCompressed(res, data) {
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Content-Type', 'application/json');
  res.end(compress(data));
}
```

2. **Batch Database Operations**
```javascript
// Instead of saving after each change
data.transactions.push(newTransaction);
persistData();

// Batch multiple changes
const changes = [];
changes.push(() => data.transactions.push(tx1));
changes.push(() => data.budgets.push(budget1));
changes.forEach(fn => fn());
persistData(); // Save once
```

---

## 9. Monitoring & Logging

### Add Request Logging

```javascript
function logRequest(req, res, duration) {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.headers['user-agent']
  };
  
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service
    console.log(JSON.stringify(log));
  } else {
    console.log(`${log.method} ${log.url} - ${log.status} (${log.duration})`);
  }
}
```

### Add Error Tracking

```javascript
function trackError(error, context) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    context
  };
  
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry)
    console.error(JSON.stringify(errorLog));
  } else {
    console.error('Error:', errorLog);
  }
}
```

---

## 10. Troubleshooting

### Common Issues

**Issue: Toast notifications not showing**
- Check if toast.js is imported as a module
- Verify CSS is loaded (check for .toast-container in DOM)
- Check browser console for errors

**Issue: Skeletons not hiding**
- Ensure you're calling skeleton.hide() or setting innerHTML
- Check if container exists before showing skeleton
- Verify async operations are completing

**Issue: Analytics endpoints returning empty data**
- Check authentication (use browser DevTools Network tab)
- Verify user has transactions in database
- Check currency parameter matches user's transactions

**Issue: Rate limiting blocking requests**
- Check X-RateLimit headers in response
- Wait for reset time
- Adjust rate limit settings if needed

---

## 📚 Additional Resources

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Web Performance Optimization](https://web.dev/fast/)

---

*Implementation Guide for FinTrackr*  
*Version: 1.0*  
*Last Updated: November 15, 2025*
