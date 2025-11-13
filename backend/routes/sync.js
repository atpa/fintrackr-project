const express = require('express');
const controller = require('../controllers/syncController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/connections', asyncHandler(controller.connections));
router.post('/connect', asyncHandler(controller.connect));
router.post('/transactions', asyncHandler(controller.syncTransactions));

module.exports = router;
