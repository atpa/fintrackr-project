/**
 * Accounts Repository
 * Specialized methods for accounts
 */

const BaseRepository = require("./BaseRepository");
const DbBaseRepository = require("./DbBaseRepository");
const { convertAmount } = require("../services/currencyService");
const { ENV } = require("../config/constants");

class AccountsRepository extends BaseRepository {
  constructor() {
    super("accounts");
    this.dbRepo = new DbBaseRepository("accounts");
  }

  /**
   * Find accounts by user ID
   */
  findByUserId(userId) {
    if (ENV.USE_DB) {
      // Draft passthrough: filter after dbRepo.findAll()
      return this.dbRepo.findAll().then(list => list.filter(a => a.user_id === Number(userId)));
    }
    return this.findBy({ user_id: Number(userId) });
  }

  /**
   * Update account balance
   */
  updateBalance(accountId, amount) {
    if (ENV.USE_DB) {
      return this.dbRepo.findById(accountId).then(account => {
        if (!account) return null;
        const updated = { balance: Number(account.balance) + Number(amount) };
        return this.dbRepo.update(accountId, updated);
      });
    }
    const account = this.findById(accountId);
    if (!account) return null;
    return this.update(accountId, { balance: Number(account.balance) + Number(amount) });
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
