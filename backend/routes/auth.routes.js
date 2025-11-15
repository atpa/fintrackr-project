const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', AuthController.register);

// POST /api/auth/login
router.post('/login', AuthController.login);

// POST /api/auth/logout
router.post('/logout', AuthController.logout);

// GET /api/auth/session
router.get('/session', authMiddleware, AuthController.checkSession);

// POST /api/auth/refresh
// router.post('/refresh', AuthController.refresh); // Будет реализовано позже

module.exports = router;
