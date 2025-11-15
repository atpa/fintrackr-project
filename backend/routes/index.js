const express = require('express');
const authRoutes = require('./auth');
const accountsRoutes = require('./accounts');
// Import other routes as they are created
// const transactionsRoutes = require('./transactions');
// const categoriesRoutes = require('./categories');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountsRoutes);
// router.use('/transactions', transactionsRoutes);
// router.use('/categories', categoriesRoutes);

module.exports = router;
