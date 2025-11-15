const AuthService = require('../services/auth.service');
const { sendError } = require('../utils/responses');

/**
 * Middleware для проверки JWT.
 * Извлекает токен из cookie, проверяет его и добавляет `req.user`.
 */
const authMiddleware = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return sendError(res, 401, 'Unauthorized: No token provided');
  }

  const payload = AuthService.verifyAccessToken(token);
  if (!payload) {
    return sendError(res, 401, 'Unauthorized: Invalid token');
  }

  req.user = payload.user;
  next();
};

module.exports = authMiddleware;
