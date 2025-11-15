const express = require('express');
const authRoutes = require('./auth.routes');
const accountRoutes = require('./account.routes');

const router = express.Router();

// Базовый роут API
router.get('/', (req, res) => {
  res.json({ message: 'FinTrackr API v2.0' });
});

// Подключение роутов аутентификации
router.use('/auth', authRoutes);

// Подключение роутов для счетов
router.use('/accounts', accountRoutes);

module.exports = router;
