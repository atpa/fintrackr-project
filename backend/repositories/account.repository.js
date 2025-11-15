const dataService = require('../services/dataService');

class AccountRepository {
  /**
   * Находит все счета для указанного пользователя.
   * @param {number} userId - ID пользователя.
   * @returns {Promise<Array<object>>}
   */
  async findAllByUserId(userId) {
    const db = await dataService.readData();
    return db.accounts.filter(acc => acc.userId === userId);
  }

  /**
   * Находит один счет по его ID.
   * @param {number} accountId - ID счета.
   * @returns {Promise<object|null>}
   */
  async findById(accountId) {
    const db = await dataService.readData();
    return db.accounts.find(acc => acc.id === accountId) || null;
  }

  /**
   * Создает новый счет.
   * @param {object} accountData - Данные счета (name, balance, currency, userId).
   * @returns {Promise<object>}
   */
  async create(accountData) {
    const db = await dataService.readData();
    const newAccount = {
      id: db.accounts.length > 0 ? Math.max(...db.accounts.map(a => a.id)) + 1 : 1,
      ...accountData,
      createdAt: new Date().toISOString(),
    };
    db.accounts.push(newAccount);
    await dataService.writeData(db);
    return newAccount;
  }

  /**
   * Обновляет счет.
   * @param {number} accountId - ID счета для обновления.
   * @param {object} updateData - Данные для обновления.
   * @returns {Promise<object|null>}
   */
  async update(accountId, updateData) {
    const db = await dataService.readData();
    const accountIndex = db.accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) {
      return null;
    }
    const updatedAccount = { ...db.accounts[accountIndex], ...updateData };
    db.accounts[accountIndex] = updatedAccount;
    await dataService.writeData(db);
    return updatedAccount;
  }

  /**
   * Удаляет счет.
   * @param {number} accountId - ID счета для удаления.
   * @returns {Promise<boolean>} - true, если удаление успешно.
   */
  async delete(accountId) {
    const db = await dataService.readData();
    const initialLength = db.accounts.length;
    db.accounts = db.accounts.filter(acc => acc.id !== accountId);
    if (db.accounts.length < initialLength) {
      await dataService.writeData(db);
      // Также нужно обновить транзакции, убрав у них accountId
      db.transactions.forEach(tx => {
        if (tx.accountId === accountId) {
          tx.accountId = null;
        }
      });
      await dataService.writeData(db);
      return true;
    }
    return false;
  }
}

module.exports = new AccountRepository();
