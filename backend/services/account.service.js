const AccountRepository = require('../repositories/account.repository');
const { HttpError } = require('../utils/http');

class AccountService {
  /**
   * Получает все счета для пользователя.
   * @param {number} userId - ID пользователя.
   */
  async getAllAccounts(userId) {
    return AccountRepository.findAllByUserId(userId);
  }

  /**
   * Получает один счет, проверяя права доступа.
   * @param {number} accountId - ID счета.
   * @param {number} userId - ID пользователя, запрашивающего счет.
   */
  async getAccountById(accountId, userId) {
    const account = await AccountRepository.findById(accountId);
    if (!account) {
      throw new HttpError(404, 'Account not found');
    }
    if (account.userId !== userId) {
      throw new HttpError(403, 'Forbidden: You do not have access to this account');
    }
    return account;
  }

  /**
   * Создает новый счет для пользователя.
   * @param {object} accountData - Данные для создания (name, balance, currency).
   * @param {number} userId - ID пользователя.
   */
  async createAccount(accountData, userId) {
    const dataToCreate = {
      ...accountData,
      userId,
    };
    return AccountRepository.create(dataToCreate);
  }

  /**
   * Обновляет счет, проверяя права доступа.
   * @param {number} accountId - ID счета.
   * @param {object} updateData - Данные для обновления.
   * @param {number} userId - ID пользователя.
   */
  async updateAccount(accountId, updateData, userId) {
    const account = await this.getAccountById(accountId, userId); // Проверка прав
    return AccountRepository.update(accountId, updateData);
  }

  /**
   * Удаляет счет, проверяя права доступа.
   * @param {number} accountId - ID счета.
   * @param {number} userId - ID пользователя.
   */
  async deleteAccount(accountId, userId) {
    await this.getAccountById(accountId, userId); // Проверка прав
    const result = await AccountRepository.delete(accountId);
    if (!result) {
      throw new HttpError(500, 'Failed to delete the account');
    }
    return result;
  }
}

module.exports = new AccountService();
