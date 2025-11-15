/**
 * Bank sync routes
 * Handles bank connection and transaction synchronization
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');

router.use(authenticateRequest);

// GET /api/sync/connections
router.get('/connections', (req, res) => {
  // TODO: Implement bank connections list
  res.json([]);
});

// POST /api/sync/transactions
router.post('/transactions', (req, res) => {
  // TODO: Implement transaction sync
  res.status(501).json({ error: 'Bank sync not implemented yet' });
});

module.exports = router;
