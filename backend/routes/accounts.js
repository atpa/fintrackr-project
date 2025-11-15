/**
 * Accounts routes
 * Handles CRUD operations for user accounts
 */

const express = require('express');
const router = express.Router();
const {
  getAccountsByUserId,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount
} = require('../services/dataService.new');
const { authenticateRequest } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateRequest);

/**
 * GET /api/accounts
 * Get all accounts for authenticated user
 */
router.get('/', (req, res) => {
  try {
    const accounts = getAccountsByUserId(req.user.userId);
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/accounts/:id
 * Get specific account by ID
 */
router.get('/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/accounts
 * Create new account
 */
router.post('/', (req, res) => {
  try {
    const { name, currency, balance } = req.body;
    
    if (!name || !currency) {
      return res.status(400).json({ error: 'Name and currency are required' });
    }
    
    const accountId = createAccount(
      req.user.userId,
      name,
      currency,
      balance || 0
    );
    
    const account = getAccountById(accountId);
    res.status(201).json(account);
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/accounts/:id
 * Update account
 */
router.put('/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, currency, balance } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (currency !== undefined) updates.currency = currency;
    if (balance !== undefined) updates.balance = balance;
    
    updateAccount(req.params.id, updates);
    
    const updatedAccount = getAccountById(req.params.id);
    res.json(updatedAccount);
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete account
 */
router.delete('/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    deleteAccount(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
