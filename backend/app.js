const path = require('path');
const express = require('express');
const morgan = require('morgan');

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
const errorHandler = require('./middleware/errorHandler');
const { AppError } = require('./utils/responses');

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// API routes
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
app.use('/api', authRouter);

// Fallback for unmatched API routes
app.use('/api', (req, res, next) => {
  next(new AppError(404, 'Not found'));
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
