const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/user.repository');
const { HttpError } = require('../utils/http');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN,
} = require('../config/constants');

class AuthService {
  /**
   * Регистрирует нового пользователя.
   * @param {string} email - Email.
   * @param {string} password - Пароль.
   * @returns {Promise<object>}
   */
  async register(email, password) {
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new HttpError(409, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserRepository.create({ email, password: hashedPassword });

    return newUser;
  }

  /**
   * Выполняет вход пользователя.
   * @param {string} email - Email.
   * @param {string} password - Пароль.
   * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
   */
  async login(email, password) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const { password: _, ...userPayload } = user;

    const accessToken = this.generateAccessToken(userPayload);
    const refreshToken = this.generateRefreshToken(userPayload);

    // Здесь в будущем будет логика сохранения refresh-токена в БД
    
    return { accessToken, refreshToken, user: userPayload };
  }

  /**
   * Генерирует Access Token.
   * @param {object} userPayload - Данные пользователя.
   * @returns {string}
   */
  generateAccessToken(userPayload) {
    return jwt.sign({ user: userPayload }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Генерирует Refresh Token.
   * @param {object} userPayload - Данные пользователя.
   * @returns {string}
   */
  generateRefreshToken(userPayload) {
    return jwt.sign({ userId: userPayload.id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  /**
   * Проверяет Access Token.
   * @param {string} token - Access Token.
   * @returns {object|null}
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new AuthService();
