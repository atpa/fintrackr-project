const express = require('express');
const AccountController = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Все роуты для счетов требуют аутентификации
router.use(authMiddleware);

// Маршруты
router.get('/', AccountController.getAll);
router.post('/', AccountController.create);
router.get('/:id', AccountController.getById);
router.put('/:id', AccountController.update);
router.delete('/:id', AccountController.delete);

module.exports = router;
