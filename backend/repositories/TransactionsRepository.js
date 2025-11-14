/**
 * Transactions Repository
 * Specialized methods for transactions
 */

const BaseRepository = require("./BaseRepository");
const { convertAmount } = require("../services/currencyService");

class TransactionsRepository extends BaseRepository {
  constructor() {
    super("transactions");
  }

  /**
   * Find transactions by user ID
   */
  findByUserId(userId) {
    return this.findBy({ user_id: Number(userId) });
  }

  /**
   * Find transactions by type (income/expense)
   */
  findByType(userId, type) {
    return this.findBy({ user_id: Number(userId), type });
  }

  /**
   * Find transactions by account
   */
  findByAccount(userId, accountId) {
    return this.findBy({ user_id: Number(userId), account_id: Number(accountId) });
  }

  /**
   * Find transactions by category
   */
  findByCategory(userId, categoryId) {
    return this.findBy({ user_id: Number(userId), category_id: Number(categoryId) });
  }

  /**
   * Find transactions by date range
   */
  findByDateRange(userId, fromDate, toDate) {
    const transactions = this.findByUserId(userId);
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= new Date(fromDate) && txDate <= new Date(toDate);
    });
  }

  /**
   * Calculate total for user
   */
  calculateTotal(userId, type = null, currency = "USD") {
    const transactions = type
      ? this.findByType(userId, type)
      : this.findByUserId(userId);

    return transactions.reduce((sum, tx) => {
      const amount = convertAmount(tx.amount, tx.currency || "USD", currency);
      return sum + amount;
    }, 0);
  }

  /**
   * Get transactions grouped by category
   */
  groupByCategory(userId, type = "expense") {
    const transactions = this.findByType(userId, type);
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
  findRecent(userId, limit = 10) {
    const transactions = this.findByUserId(userId);
    return transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }
}

module.exports = TransactionsRepository;
