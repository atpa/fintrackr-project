const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const accountsRouter = require('./routes/accounts');
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const budgetsRouter = require('./routes/budgets');
const goalsRouter = require('./routes/goals');
const plannedRouter = require('./routes/planned');
const subscriptionsRouter = require('./routes/subscriptions');
const rulesRouter = require('./routes/rules');
const analyticsRouter = require('./routes/analytics');
const currencyRouter = require('./routes/currency');
const metaRouter = require('./routes/meta');
const syncRouter = require('./routes/sync');
const authRouter = require('./routes/auth');
const twofaRouter = require('./routes/twofa');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const { securityHeaders, sanitizeInput } = require('./middleware/security');
const { validateCsrfToken, getCsrfToken } = require('./middleware/csrf');
const { authenticateRequest } = require('./middleware/auth');
const { requestTimeout } = require('./middleware/timeout');
const logger = require('./utils/logger');

const app = express();

// Disable ETag generation to prevent 304 on API JSON responses
app.set('etag', false);

// Request timeout middleware (30 seconds for all requests)
app.use(requestTimeout(30000));

// Security middleware
app.use(securityHeaders);
app.use(sanitizeInput);

// HTTP request logging
app.use(morgan('dev'));

// Log HTTP requests with Winston
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Use originalUrl to capture full mounted route path (e.g., /api/accounts)
    logger.logRequest(req.method, req.originalUrl || req.url, res.statusCode, duration);
  });
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure API responses are never cached by the browser
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// CSRF protection for all API routes (validates POST/PUT/DELETE/PATCH)
app.use('/api', validateCsrfToken);

// API routes - Auth routes first (no authentication required)
app.use('/api', authRouter);
app.use('/api/2fa', twofaRouter);

// CSRF token endpoint
app.get('/api/csrf-token', authenticateRequest, getCsrfToken);

// Protected routes (require authentication)
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/planned', plannedRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api', analyticsRouter);
app.use('/api', currencyRouter);
app.use('/api', metaRouter);
app.use('/api/sync', syncRouter);

// Fallback for unmatched API routes
app.use('/api', (req, res, next) => {
  next(new AppError('Not found', 404));
});

// Static files
const publicDir = path.join(__dirname, '..', 'public');
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'landing.html'));
});
app.use(express.static(publicDir));

// Handle non-API 404
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return res.status(404).send('Not Found');
});

app.use(errorHandler);

module.exports = app;
