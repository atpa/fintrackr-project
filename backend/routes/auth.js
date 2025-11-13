const express = require('express');
const controller = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(controller.register));
router.post('/login', asyncHandler(controller.login));

module.exports = router;
