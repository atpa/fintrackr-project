/**
 * Transactions routes
 * Handles CRUD operations for transactions
 */

const express = require('express');
const router = express.Router();
const {
  getTransactionsByUserId,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAccountById,
  updateAccount,
  getBudgetByUserCategoryMonth,
  createBudget,
  updateBudget
} = require('../services/dataService.new');
const { authenticateRequest } = require('../middleware/auth');
const { convertAmount } = require('../services/currencyService');

router.use(authenticateRequest);

/**
 * GET /api/transactions
 * Get all transactions for authenticated user
 */
router.get('/', (req, res) => {
  try {
    const transactions = getTransactionsByUserId(req.user.userId);
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/transactions
 * Create new transaction and update account balance and budgets
 */
router.post('/', (req, res) => {
  try {
    const { account_id, category_id, type, amount, currency, date, note } = req.body;
    
    // Validation
    if (!account_id || !type || !amount || !currency || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be income or expense' });
    }
    
    // Verify account ownership
    const account = getAccountById(account_id);
    if (!account || account.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Invalid account' });
    }
    
    // Create transaction
    const transactionId = createTransaction(
      req.user.userId,
      account_id,
      category_id || null,
      type,
      amount,
      currency,
      date,
      note || null
    );
    
    // Update account balance
    const convertedAmount = convertAmount(amount, currency, account.currency);
    const newBalance = type === 'income' 
      ? account.balance + convertedAmount
      : account.balance - convertedAmount;
    
    updateAccount(account_id, { balance: newBalance });
    
    // Update budget if expense and has category
    if (type === 'expense' && category_id) {
      const month = date.substring(0, 7); // Extract YYYY-MM
      let budget = getBudgetByUserCategoryMonth(req.user.userId, category_id, month);
      
      if (!budget) {
        // Auto-create budget
        createBudget(req.user.userId, category_id, month, 0, convertedAmount, 'fixed', null, currency);
      } else {
        const budgetAmount = convertAmount(amount, currency, budget.currency || 'USD');
        updateBudget(budget.id, { spent: budget.spent + budgetAmount });
      }
    }
    
    const transaction = getTransactionById(transactionId);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete transaction and revert account balance and budget
 */
router.delete('/:id', (req, res) => {
  try {
    const transaction = getTransactionById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Revert account balance
    const account = getAccountById(transaction.account_id);
    if (account) {
      const convertedAmount = convertAmount(transaction.amount, transaction.currency, account.currency);
      const newBalance = transaction.type === 'income'
        ? account.balance - convertedAmount
        : account.balance + convertedAmount;
      
      updateAccount(account.id, { balance: newBalance });
    }
    
    // Revert budget if expense
    if (transaction.type === 'expense' && transaction.category_id) {
      const month = transaction.date.substring(0, 7);
      const budget = getBudgetByUserCategoryMonth(req.user.userId, transaction.category_id, month);
      
      if (budget) {
        const budgetAmount = convertAmount(transaction.amount, transaction.currency, budget.currency || 'USD');
        updateBudget(budget.id, { spent: Math.max(0, budget.spent - budgetAmount) });
      }
    }
    
    deleteTransaction(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
