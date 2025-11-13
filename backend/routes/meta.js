const express = require('express');
const controller = require('../controllers/metaController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/banks', asyncHandler(controller.banks));

module.exports = router;
