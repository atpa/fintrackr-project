const express = require('express');
const controller = require('../controllers/transactionsController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
