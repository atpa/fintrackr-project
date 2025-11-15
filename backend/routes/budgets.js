/**
 * Budgets routes
 * Handles CRUD operations for budgets
 */

const express = require('express');
const router = express.Router();
const {
  getBudgetsByUserId,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget
} = require('../services/dataService.new');
const { authenticateRequest } = require('../middleware/auth');

router.use(authenticateRequest);

router.get('/', (req, res) => {
  try {
    const budgets = getBudgetsByUserId(req.user.userId);
    res.json(budgets);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const { category_id, month, limit_amount, type, percent, currency } = req.body;
    
    if (!category_id || !month) {
      return res.status(400).json({ error: 'Category and month are required' });
    }
    
    const budgetId = createBudget(
      req.user.userId,
      category_id,
      month,
      limit_amount || 0,
      0,
      type || 'fixed',
      percent || null,
      currency || 'USD'
    );
    
    const budget = getBudgetById(budgetId);
    res.status(201).json(budget);
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const budget = getBudgetById(req.params.id);
    
    if (!budget || budget.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const { limit_amount, spent, type, percent, currency } = req.body;
    const updates = {};
    
    if (limit_amount !== undefined) updates.limit_amount = limit_amount;
    if (spent !== undefined) updates.spent = spent;
    if (type !== undefined) updates.type = type;
    if (percent !== undefined) updates.percent = percent;
    if (currency !== undefined) updates.currency = currency;
    
    updateBudget(req.params.id, updates);
    const updated = getBudgetById(req.params.id);
    
    res.json(updated);
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const budget = getBudgetById(req.params.id);
    
    if (!budget || budget.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    deleteBudget(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
