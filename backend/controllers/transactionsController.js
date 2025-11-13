const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { ALLOWED_CURRENCIES } = require('../utils/constants');
const { getNextId, findById } = require('../utils/dataHelpers');
const { convertAmount } = require('../utils/currency');

async function list(req, res) {
  const transactions = await store.read((data) => data.transactions);
  return success(res, transactions);
}

async function create(req, res) {
  const payload = req.body || {};
  const { account_id, category_id, type, amount, currency, date, note } = payload;

  if (!account_id || !category_id || !type || amount == null || !date || !currency) {
    throw new AppError(400, 'Missing transaction parameters');
  }
  if (!['income', 'expense'].includes(String(type))) {
    throw new AppError(400, 'Invalid transaction type');
  }
  const value = Number(amount);
  if (!isFinite(value) || value < 0) {
    throw new AppError(400, 'Invalid amount');
  }
  if (!ALLOWED_CURRENCIES.includes(String(currency))) {
    throw new AppError(400, 'Invalid currency');
  }

  const transaction = await store.write((data) => {
    const account = findById(data.accounts, account_id);
    if (!account) {
      throw new AppError(404, 'Account not found');
    }
    const category = findById(data.categories, category_id);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }
    if (
      (category.kind === 'income' && String(type) !== 'income') ||
      (category.kind === 'expense' && String(type) !== 'expense')
    ) {
      throw new AppError(400, 'Transaction type does not match category kind');
    }

    const newTransaction = {
      id: getNextId(data.transactions),
      account_id: Number(account_id),
      category_id: Number(category_id),
      type: String(type),
      amount: value,
      currency: String(currency),
      date,
      note: note || '',
    };

    data.transactions.push(newTransaction);

    const accountCurrency = account.currency || 'USD';
    const adjustment = convertAmount(
      Number(newTransaction.amount),
      newTransaction.currency || accountCurrency,
      accountCurrency
    );

    if (newTransaction.type === 'income') {
      account.balance = Number(account.balance) + adjustment;
    } else {
      account.balance = Number(account.balance) - adjustment;
    }

    if (newTransaction.type === 'expense') {
      const txDate = new Date(newTransaction.date);
      const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      let budget = data.budgets.find(
        (item) => item.category_id === newTransaction.category_id && item.month === month
      );
      if (!budget) {
        budget = {
          id: getNextId(data.budgets),
          category_id: newTransaction.category_id,
          month,
          limit: 0,
          spent: 0,
          currency: 'USD',
          type: 'fixed',
          percent: null,
        };
        data.budgets.push(budget);
      }
      const budgetCurrency = budget.currency || 'USD';
      const delta = convertAmount(
        Number(newTransaction.amount),
        newTransaction.currency || 'USD',
        budgetCurrency
      );
      budget.spent = Number(budget.spent) + Number(delta);
    }

    return newTransaction;
  });

  return success(res, transaction, 201);
}

async function remove(req, res) {
  const { id } = req.params;

  await store.write((data) => {
    const index = data.transactions.findIndex((item) => Number(item.id) === Number(id));
    if (index === -1) {
      throw new AppError(404, 'Transaction not found');
    }
    const tx = data.transactions[index];
    const account = findById(data.accounts, tx.account_id);
    if (account) {
      const adjustment = convertAmount(
        Number(tx.amount),
        tx.currency || account.currency || 'USD',
        account.currency || 'USD'
      );
      if (tx.type === 'income') {
        account.balance = Number(account.balance) - adjustment;
      } else {
        account.balance = Number(account.balance) + adjustment;
      }
    }

    if (tx.type === 'expense') {
      const txDate = new Date(tx.date);
      const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      const budget = data.budgets.find(
        (item) => item.category_id === tx.category_id && item.month === month
      );
      if (budget) {
        const budgetCurrency = budget.currency || 'USD';
        const delta = convertAmount(
          Number(tx.amount),
          tx.currency || 'USD',
          budgetCurrency
        );
        budget.spent = Math.max(0, Number(budget.spent) - Number(delta));
      }
    }

    data.transactions.splice(index, 1);
    return { id: Number(id) };
  });

  return success(res, { id: Number(id) });
}

module.exports = {
  list,
  create,
  remove,
};
