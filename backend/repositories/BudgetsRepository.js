/**
 * Budgets Repository
 * Specialized methods for budgets
 */

const BaseRepository = require("./BaseRepository");

class BudgetsRepository extends BaseRepository {
  constructor() {
    super("budgets");
  }

  /**
   * Find budgets by user ID
   */
  findByUserId(userId) {
    return this.findBy({ user_id: Number(userId) });
  }

  /**
   * Find budget by category and month
   */
  findByCategoryAndMonth(userId, categoryId, month) {
    return this.findOneBy({
      user_id: Number(userId),
      category_id: Number(categoryId),
      month,
    });
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
   * Increment budget spent amount
   */
  incrementSpent(budgetId, amount) {
    const budget = this.findById(budgetId);
    if (!budget) return null;

    return this.update(budgetId, {
      spent: Number(budget.spent) + Number(amount),
    });
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
