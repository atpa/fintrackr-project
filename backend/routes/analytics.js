/**
 * Analytics routes
 * Handles analytics endpoints for insights and forecasts
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const { 
  analyzeSpendingTrends,
  forecastSpending,
  analyzeByCategory,
  detectAnomalies,
  generateBudgetRecommendations,
  analyzeSavingsPotential
} = require('../services/analyticsService');
const { convertAmount } = require('../services/currencyService');
const db = require('../services/dataService.new');

router.use(authenticateRequest);

/**
 * GET /api/forecast
 * Returns 30-day forecast based on historical data
 * Compatible with dashboard.js expectations
 */
router.get('/forecast', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get transactions for last 30 days
    const stmt = db.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      AND date >= date('now', '-30 days')
      ORDER BY date DESC
    `);
    const transactions = stmt.all(userId);
    
    if (!transactions || transactions.length === 0) {
      return res.json({
        predicted_income: 0,
        predicted_expense: 0,
        days: 30,
        confidence: 'low',
        message: 'Not enough historical data'
      });
    }
    
    // Calculate daily averages
    const days = 30;
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(tx => {
      const amount = convertAmount(tx.amount, tx.currency || 'USD', 'USD');
      if (tx.type === 'income') {
        totalIncome += amount;
      } else if (tx.type === 'expense') {
        totalExpense += amount;
      }
    });
    
    const avgIncome = totalIncome / days;
    const avgExpense = totalExpense / days;
    
    const forecast = {
      predicted_income: +(avgIncome * days).toFixed(2),
      predicted_expense: +(avgExpense * days).toFixed(2),
      days: days,
      confidence: transactions.length >= 20 ? 'high' : transactions.length >= 10 ? 'medium' : 'low',
      data_points: transactions.length
    };
    
    res.json(forecast);
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

/**
 * GET /api/analytics/trends
 * Returns spending trends analysis
 */
router.get('/analytics/trends', (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    const stmt = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date');
    const transactions = stmt.all(userId);
    
    const trends = analyzeSpendingTrends(transactions, currency, convertAmount);
    
    res.json(trends);
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to analyze trends' });
  }
});

/**
 * GET /api/analytics/categories
 * Returns spending breakdown by category
 */
router.get('/analytics/categories', (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    const txStmt = db.prepare('SELECT * FROM transactions WHERE user_id = ?');
    const catStmt = db.prepare('SELECT * FROM categories WHERE user_id = ?');
    
    const transactions = txStmt.all(userId);
    const categories = catStmt.all(userId);
    
    const analysis = analyzeByCategory(transactions, categories, currency, convertAmount);
    
    res.json(analysis);
  } catch (error) {
    console.error('Category analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze categories' });
  }
});

/**
 * GET /api/analytics/anomalies
 * Detects unusual spending patterns
 */
router.get('/analytics/anomalies', (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    const stmt = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC');
    const transactions = stmt.all(userId);
    
    const anomalies = detectAnomalies(transactions, currency, convertAmount);
    
    res.json({ anomalies });
  } catch (error) {
    console.error('Anomalies detection error:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

/**
 * GET /api/analytics/recommendations
 * Generate budget recommendations
 */
router.get('/analytics/recommendations', (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    const txStmt = db.prepare('SELECT * FROM transactions WHERE user_id = ?');
    const catStmt = db.prepare('SELECT * FROM categories WHERE user_id = ?');
    
    const transactions = txStmt.all(userId);
    const categories = catStmt.all(userId);
    
    const recommendations = generateBudgetRecommendations(
      transactions, 
      categories, 
      currency, 
      convertAmount
    );
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * GET /api/analytics/savings
 * Analyze savings potential
 */
router.get('/analytics/savings', (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    const txStmt = db.prepare('SELECT * FROM transactions WHERE user_id = ?');
    const catStmt = db.prepare('SELECT * FROM categories WHERE user_id = ?');
    
    const transactions = txStmt.all(userId);
    const categories = catStmt.all(userId);
    
    const savings = analyzeSavingsPotential(
      transactions, 
      categories, 
      currency, 
      convertAmount
    );
    
    res.json(savings);
  } catch (error) {
    console.error('Savings analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze savings' });
  }
});

/**
 * GET /api/recurring
 * Detect recurring transactions (placeholder for future ML)
 */
router.get('/recurring', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get recurring transactions from database
    const stmt = db.prepare('SELECT * FROM recurring WHERE user_id = ?');
    const recurring = stmt.all(userId);
    
    res.json({ recurring });
  } catch (error) {
    console.error('Recurring detection error:', error);
    res.status(500).json({ error: 'Failed to detect recurring transactions' });
  }
});

/**
 * GET /api/insights
 * AI-powered financial insights
 */
router.get('/insights', (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.query.currency || 'USD';
    
    const txStmt = db.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      AND date >= date('now', '-90 days')
      ORDER BY date DESC
    `);
    const catStmt = db.prepare('SELECT * FROM categories WHERE user_id = ?');
    const budStmt = db.prepare(`
      SELECT * FROM budgets 
      WHERE user_id = ? 
      AND month = strftime('%Y-%m', 'now')
    `);
    
    const transactions = txStmt.all(userId);
    const categories = catStmt.all(userId);
    const budgets = budStmt.all(userId);
    
    const insights = [];
    
    // Insight 1: Top spending categories
    const categoryAnalysis = analyzeByCategory(transactions, categories, currency, convertAmount);
    if (categoryAnalysis.length > 0) {
      const topCategory = categoryAnalysis[0];
      insights.push({
        type: 'category',
        priority: 'high',
        title: `Highest spending: ${topCategory.name}`,
        description: `You've spent ${topCategory.total.toFixed(2)} ${currency} in ${topCategory.name} (${topCategory.percentage.toFixed(1)}% of total)`,
        icon: '📊',
        action: {
          label: 'Set Budget',
          url: '/budgets.html'
        }
      });
    }
    
    // Insight 2: Budget warnings
    budgets.forEach(budget => {
      const ratio = budget.limit > 0 ? budget.spent / budget.limit : 0;
      if (ratio >= 0.8) {
        const category = categories.find(c => c.id === budget.category_id);
        insights.push({
          type: 'budget',
          priority: ratio >= 1 ? 'critical' : 'warning',
          title: `Budget alert: ${category?.name || 'Unknown'}`,
          description: `You've spent ${(ratio * 100).toFixed(0)}% of your budget`,
          icon: '⚠️',
          action: {
            label: 'View Budget',
            url: `/budgets.html?category=${budget.category_id}`
          }
        });
      }
    });
    
    // Insight 3: Savings potential
    const savings = analyzeSavingsPotential(transactions, categories, currency, convertAmount);
    if (savings.total_potential > 0) {
      insights.push({
        type: 'savings',
        priority: 'medium',
        title: 'Savings opportunity detected',
        description: savings.impact,
        icon: '💰',
        action: {
          label: 'View Details',
          url: '/reports.html'
        }
      });
    }
    
    // Insight 4: Anomalies
    const anomalies = detectAnomalies(transactions, currency, convertAmount);
    if (anomalies.length > 0) {
      const topAnomaly = anomalies[0];
      insights.push({
        type: 'anomaly',
        priority: 'medium',
        title: 'Unusual transaction detected',
        description: `${topAnomaly.description}: ${topAnomaly.normalizedAmount.toFixed(2)} ${currency} (${topAnomaly.percentageAboveMean}% above average)`,
        icon: '🔍',
        action: {
          label: 'Review',
          url: `/transactions.html?id=${topAnomaly.id}`
        }
      });
    }
    
    res.json({ insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
