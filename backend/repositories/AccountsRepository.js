/**
 * Accounts Repository
 * Specialized methods for accounts
 */

const BaseRepository = require("./BaseRepository");
const { convertAmount } = require("../services/currencyService");

class AccountsRepository extends BaseRepository {
  constructor() {
    super("accounts");
  }

  /**
   * Find accounts by user ID
   */
  findByUserId(userId) {
    return this.findBy({ user_id: Number(userId) });
  }

  /**
   * Update account balance
   */
  updateBalance(accountId, amount) {
    const account = this.findById(accountId);
    if (!account) return null;

    return this.update(accountId, {
      balance: Number(account.balance) + Number(amount),
    });
  }

  /**
   * Calculate total balance for user (in specific currency)
   */
  calculateTotalBalance(userId, currency = "USD") {
    const accounts = this.findByUserId(userId);
    return accounts.reduce((sum, account) => {
      const balance = convertAmount(
        account.balance,
        account.currency || "USD",
        currency
      );
      return sum + balance;
    }, 0);
  }

  /**
   * Find account by name
   */
  findByName(userId, name) {
    return this.findOneBy({ user_id: Number(userId), name });
  }
}

module.exports = AccountsRepository;
