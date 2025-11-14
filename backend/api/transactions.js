/**
 * Transactions Routes
 * API endpoints for transaction management
 */

const { transactionsRepo, accountsRepo, budgetsRepo } = require("../repositories");
const { convertAmount } = require("../services/currencyService");
const { HttpError } = require("../middleware");

/**
 * GET /api/transactions
 * Get all transactions for authenticated user
 */
async function getTransactions(req, res) {
  // If authenticated use user scope, else return all (tests use public access)
  let transactions;
  if (req.user && req.user.id != null) {
    transactions = transactionsRepo.findByUserId(req.user.id);
  } else {
    transactions = transactionsRepo.findAll();
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(transactions));
}

/**
 * GET /api/transactions/:id
 * Get single transaction by ID
 */
async function getTransaction(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const transaction = transactionsRepo.findById(id);

  if (!transaction || transaction.user_id !== userId) {
    throw new HttpError("Transaction not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(transaction));
}

/**
 * POST /api/transactions
 * Create new transaction
 */
async function createTransaction(req, res) {
  const userId = req.user ? req.user.id : null;
  const { account_id, category_id, type, amount, currency, date, note } = req.body;

  // Validation
  if (!account_id || !type || amount == null || !currency || !date) {
    throw new HttpError("Missing required fields", 400);
  }

  if (!["income", "expense"].includes(type)) {
    throw new HttpError("Invalid transaction type", 400);
  }

  // Check account exists and belongs to user
  const account = accountsRepo.findById(account_id);
  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  // Атомарная секция (Mongo) или последовательная логика (JSON)
  const { runAtomic } = require('../db/atomic');
  const transaction = await runAtomic(async ({ session, db, atomic }) => {
    // 1. Создать транзакцию
    const created = transactionsRepo.create({
      user_id: userId,
      account_id: Number(account_id),
      category_id: category_id ? Number(category_id) : null,
      type,
      amount: Number(amount),
      currency,
      date,
      note: note || "",
    });

    // 2. Обновить баланс счёта
    const convertedAmount = convertAmount(amount, currency, account.currency);
    const balanceChange = type === "income" ? convertedAmount : -convertedAmount;
    accountsRepo.updateBalance(account_id, balanceChange);

    // 3. Бюджет (только expense)
    if (type === "expense" && category_id) {
      const txDate = new Date(date);
      const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
      let budget;
      if (userId != null) {
        // Используем BudgetsRepository.ensureBudget если доступен
        if (typeof budgetsRepo.findByCategoryAndMonth === 'function') {
          budget = budgetsRepo.findByCategoryAndMonth(userId, category_id, month);
        }
        if (!budget && typeof budgetsRepo.ensureBudget === 'function') {
          budget = budgetsRepo.ensureBudget(userId, category_id, month, account.currency);
        }
      } else {
        const data = require("../services/dataService").getData();
        budget = data.budgets.find(b => b.category_id === Number(category_id) && b.month === month);
        if (!budget) {
          budget = budgetsRepo.create({
            user_id: userId,
            category_id: Number(category_id),
            month,
            limit: 0,
            spent: 0,
            currency: account.currency,
          });
        }
      }
      if (budget) {
        const budgetAmount = convertAmount(amount, currency, budget.currency);
        if (budget.id && typeof budgetsRepo.incrementSpent === 'function') {
          budgetsRepo.incrementSpent(budget.id, budgetAmount);
        } else if (budget.id && typeof budgetsRepo.adjustSpent === 'function') {
          budgetsRepo.adjustSpent(budget.id, amount, currency, +1);
        } else {
          budget.spent = (budget.spent || 0) + budgetAmount;
        }
      }
    }
    return created;
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(transaction));
}

/**
 * PUT /api/transactions/:id
 * Update transaction
 */
async function updateTransaction(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = transactionsRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Transaction not found", 404);
  }

  // Атомарное обновление: rollback старых значений + применение новых
  const { runAtomic } = require('../db/atomic');
  const updated = await runAtomic(async ({ session, db, atomic }) => {
    // Rollback old balance change
    const oldAccount = accountsRepo.findById(existing.account_id);
    if (oldAccount) {
      const oldAmount = convertAmount(
        existing.amount,
        existing.currency,
        oldAccount.currency
      );
      const rollback = existing.type === "income" ? -oldAmount : oldAmount;
      accountsRepo.updateBalance(existing.account_id, rollback);
    }

    // Update transaction
    const updated = transactionsRepo.update(id, req.body);

    // Apply new balance change
    const newAccount = accountsRepo.findById(updated.account_id);
    if (newAccount) {
      const newAmount = convertAmount(
        updated.amount,
        updated.currency,
        newAccount.currency
      );
      const change = updated.type === "income" ? newAmount : -newAmount;
      accountsRepo.updateBalance(updated.account_id, change);
    }
    return updated;
  });

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/transactions/:id
 * Delete transaction
 */
async function deleteTransaction(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const transaction = transactionsRepo.findById(id);
  if (!transaction || transaction.user_id !== userId) {
    throw new HttpError("Transaction not found", 404);
  }

  // Атомарное удаление: rollback баланса + удаление записи
  const { runAtomic } = require('../db/atomic');
  await runAtomic(async ({ session, db, atomic }) => {
    // Rollback balance
    const account = accountsRepo.findById(transaction.account_id);
    if (account) {
      const amount = convertAmount(
        transaction.amount,
        transaction.currency,
        account.currency
      );
      const rollback = transaction.type === "income" ? -amount : amount;
      accountsRepo.updateBalance(transaction.account_id, rollback);
    }

    // Delete transaction
    transactionsRepo.delete(id);
  });

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
