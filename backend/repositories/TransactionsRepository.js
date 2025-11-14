/**
 * Transactions Repository
 * Specialized methods for transactions
 */

const BaseRepository = require("./BaseRepository");
const DbBaseRepository = require("./DbBaseRepository");
const { convertAmount } = require("../services/currencyService");
const { ENV } = require("../config/constants");

class TransactionsRepository extends BaseRepository {
  constructor() {
    super("transactions");
    this.dbRepo = new DbBaseRepository("transactions");
  }

  /**
   * Find transactions by user ID
   */
  findByUserId(userId) {
    if (ENV.USE_DB) {
      return this.dbRepo.findBy({ user_id: Number(userId) });
    }
    return this.findBy({ user_id: Number(userId) });
  }

  /**
   * Find transactions by type (income/expense)
   */
  findByType(userId, type) {
    if (ENV.USE_DB) {
      return this.dbRepo.findBy({ user_id: Number(userId), type });
    }
    return this.findBy({ user_id: Number(userId), type });
  }

  /**
   * Find transactions by account
   */
  findByAccount(userId, accountId) {
    if (ENV.USE_DB) {
      return this.dbRepo.findBy({ user_id: Number(userId), account_id: Number(accountId) });
    }
    return this.findBy({ user_id: Number(userId), account_id: Number(accountId) });
  }

  /**
   * Find transactions by category
   */
  findByCategory(userId, categoryId) {
    if (ENV.USE_DB) {
      return this.dbRepo.findBy({ user_id: Number(userId), category_id: Number(categoryId) });
    }
    return this.findBy({ user_id: Number(userId), category_id: Number(categoryId) });
  }

  /**
   * Find transactions by date range
   */
  async findByDateRange(userId, fromDate, toDate) {
    const transactions = await this.findByUserId(userId);
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= new Date(fromDate) && txDate <= new Date(toDate);
    });
  }

  /**
   * Calculate total for user
   */
  async calculateTotal(userId, type = null, currency = "USD") {
    const transactions = type
      ? await this.findByType(userId, type)
      : await this.findByUserId(userId);
    return transactions.reduce((sum, tx) => {
      const amount = convertAmount(tx.amount, tx.currency || "USD", currency);
      return sum + amount;
    }, 0);
  }

  /**
   * Get transactions grouped by category
   */
  async groupByCategory(userId, type = "expense") {
    const transactions = await this.findByType(userId, type);
    const groups = {};

    transactions.forEach((tx) => {
      const catId = tx.category_id || "uncategorized";
      if (!groups[catId]) {
        groups[catId] = [];
      }
      groups[catId].push(tx);
    });

    return groups;
  }

  /**
   * Get recent transactions
   */
  async findRecent(userId, limit = 10) {
    const transactions = await this.findByUserId(userId);
    return transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }
}

module.exports = TransactionsRepository;
