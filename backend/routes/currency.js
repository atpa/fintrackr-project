const express = require('express');
const controller = require('../controllers/currencyController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/convert', asyncHandler(controller.convert));
router.get('/rates', asyncHandler(controller.rates));

module.exports = router;
