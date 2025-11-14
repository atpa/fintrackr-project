/**
 * Budgets Repository
 * Специализированная логика для бюджетов.
 * Черновой вариант с поддержкой USE_DB (пока passthrough к JSON).
 */

const BaseRepository = require("./BaseRepository");
const DbBaseRepository = require("./DbBaseRepository");
const { convertAmount } = require("../services/currencyService");
const { ENV } = require("../config/constants");

class BudgetsRepository extends BaseRepository {
  constructor() {
    super("budgets");
    this.dbRepo = new DbBaseRepository("budgets");
  }

  /**
   * Найти бюджеты пользователя
   */
  findByUserId(userId) {
    if (ENV.USE_DB) {
      return this.dbRepo.findBy({ user_id: Number(userId) });
    }
    return this.findBy({ user_id: Number(userId) });
  }

  /**
   * Найти бюджет по триаде (user, category, month)
   */
  findOneByTriple(userId, categoryId, month) {
    return this.findOneBy({ user_id: Number(userId), category_id: Number(categoryId), month });
  }

  /**
   * Создать бюджет если отсутствует
   */
  ensureBudget(userId, categoryId, month, currency = "USD") {
    let existing = this.findOneByTriple(userId, categoryId, month);
    if (existing) return existing;
    return this.create({
      user_id: Number(userId),
      category_id: Number(categoryId),
      month,
      limit: 0,
      spent: 0,
      currency,
    });
  }

  /**
   * Атомарно скорректировать поле spent (черновик: неатомарно в JSON режиме)
   * direction: +1 (добавить расход) или -1 (откат расхода)
   */
  adjustSpent(budgetId, amount, amountCurrency, direction = 1) {
    const budget = this.findById(budgetId);
    if (!budget) return null;
    const converted = convertAmount(amount, amountCurrency || budget.currency, budget.currency);
    const newSpent = Number(budget.spent) + direction * converted;
    return this.update(budgetId, { spent: newSpent });
  }

  /**
   * Пересчитать spent по набору транзакций (например после миграции)
   */
  recalcSpentFromTransactions(budgetId, transactions = []) {
    const budget = this.findById(budgetId);
    if (!budget) return null;
    const total = transactions.reduce((sum, tx) => {
      if (tx.type !== "expense") return sum;
      if (tx.category_id !== budget.category_id) return sum;
      const txMonth = tx.date.slice(0, 7);
      if (txMonth !== budget.month) return sum;
      return sum + convertAmount(tx.amount, tx.currency || budget.currency, budget.currency);
    }, 0);
    return this.update(budgetId, { spent: total });
  }
  
  /**
   * Find budget by category and month (legacy compatibility)
   */
  findByCategoryAndMonth(userId, categoryId, month) {
    return this.findOneByTriple(userId, categoryId, month);
  }

  /**
   * Find budgets by month
   */
  findByMonth(userId, month) {
    return this.findBy({ user_id: Number(userId), month });
  }

  /**
   * Update budget spent amount
   */
  updateSpent(budgetId, spent) {
    return this.update(budgetId, { spent: Number(spent) });
  }

  /**
   * Increment budget spent amount (legacy compatibility)
   */
  incrementSpent(budgetId, amount) {
    return this.adjustSpent(budgetId, amount, null, 1);
  }

  /**
   * Get budget progress
   */
  getBudgetProgress(budgetId) {
    const budget = this.findById(budgetId);
    if (!budget) return null;

    const limit = Number(budget.limit) || 0;
    const spent = Number(budget.spent) || 0;
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      limit,
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
      isOverBudget: spent > limit,
    };
  }
}

module.exports = BudgetsRepository;
