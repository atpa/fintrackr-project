/**
 * Planned operations routes
 * Handles CRUD operations for planned recurring operations
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');

router.use(authenticateRequest);

// TODO: Implement planned operations CRUD
// For now, return empty array to allow app to start
router.get('/', (req, res) => {
  res.json([]);
});

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

module.exports = router;
