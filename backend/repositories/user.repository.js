const dataService = require('../services/dataService');
const bcrypt = require('bcryptjs');

class UserRepository {
  /**
   * Находит пользователя по email.
   * @param {string} email - Email пользователя.
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const db = await dataService.readData();
    return db.users.find(user => user.email === email) || null;
  }

  /**
   * Находит пользователя по ID.
   * @param {number} id - ID пользователя.
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const db = await dataService.readData();
    return db.users.find(user => user.id === id) || null;
  }

  /**
   * Создает нового пользователя.
   * @param {object} userData - Данные пользователя (email, password).
   * @returns {Promise<object>}
   */
  async create(userData) {
    const db = await dataService.readData();
    const newUser = {
      id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
      email: userData.email,
      password: userData.password, // Пароль уже должен быть хеширован
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    await dataService.writeData(db);
    // Возвращаем пользователя без пароля
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}

module.exports = new UserRepository();
