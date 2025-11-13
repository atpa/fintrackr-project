const express = require('express');
const controller = require('../controllers/budgetsController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.createOrUpdate));
router.put('/:id', asyncHandler(controller.update));
router.patch('/:id', asyncHandler(controller.update));

module.exports = router;
