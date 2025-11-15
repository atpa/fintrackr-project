const express = require('express');
const accountsController = require('../controllers/accountsController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

router.get('/', accountsController.getAccounts);
router.post('/', accountsController.createAccount);

module.exports = router;
