const AuthService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/responses');
const {
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} = require('../config/constants');

class AuthController {
  /**
   * Обрабатывает регистрацию пользователя.
   */
  async register(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required');
      }

      const newUser = await AuthService.register(email, password);
      sendSuccess(res, 201, newUser, 'User registered successfully');
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }

  /**
   * Обрабатывает вход пользователя.
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required');
      }

      const { accessToken, refreshToken, user } = await AuthService.login(email, password);

      res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
      res.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      sendSuccess(res, 200, { user }, 'Login successful');
    } catch (error) {
      sendError(res, error.statusCode || 500, error.message);
    }
  }

  /**
   * Обрабатывает выход пользователя.
   */
  logout(req, res) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    sendSuccess(res, 200, null, 'Logout successful');
  }

  /**
   * Проверяет сессию пользователя.
   */
  checkSession(req, res) {
    // Этот метод вызывается после authMiddleware, поэтому req.user уже должен быть
    sendSuccess(res, 200, { user: req.user }, 'Session is active');
  }
}

module.exports = new AuthController();
