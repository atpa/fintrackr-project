const express = require('express');
const controller = require('../controllers/analyticsController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/forecast', asyncHandler(controller.forecast));
router.get('/recurring', asyncHandler(controller.recurring));

module.exports = router;
