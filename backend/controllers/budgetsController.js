const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { ALLOWED_CURRENCIES } = require('../utils/constants');
const { getNextId, findById } = require('../utils/dataHelpers');

async function list(req, res) {
  const budgets = await store.read((data) => data.budgets);
  return success(res, budgets);
}

function validateBudgetPayload(payload) {
  if (!payload.category_id || !payload.month) {
    throw new AppError(400, 'Missing budget parameters');
  }
  if (payload.type && !['fixed', 'percent'].includes(String(payload.type))) {
    throw new AppError(400, 'Invalid budget type');
  }
  if (payload.percent != null) {
    const percent = Number(payload.percent);
    if (!isFinite(percent) || percent < 0 || percent > 100) {
      throw new AppError(400, 'Invalid percent');
    }
  }
}

async function createOrUpdate(req, res) {
  const payload = req.body || {};
  validateBudgetPayload(payload);

  const result = await store.write((data) => {
    const currency = ALLOWED_CURRENCIES.includes(String(payload.currency))
      ? String(payload.currency)
      : 'USD';

    let budget = data.budgets.find(
      (item) =>
        Number(item.category_id) === Number(payload.category_id) &&
        item.month === payload.month
    );

    if (!budget) {
      budget = {
        id: getNextId(data.budgets),
        category_id: Number(payload.category_id),
        month: String(payload.month),
        limit: Number(payload.limit) || 0,
        spent: 0,
        type: payload.type ? String(payload.type) : 'fixed',
        percent:
          payload.percent != null ? Number(payload.percent) : null,
        currency,
      };
      data.budgets.push(budget);
      return { budget, created: true };
    }

    budget.limit = Number(payload.limit) || 0;
    budget.type = payload.type ? String(payload.type) : 'fixed';
    budget.percent = payload.percent != null ? Number(payload.percent) : null;
    budget.currency = currency;
    return { budget, created: false };
  });

  return success(res, result.budget, result.created ? 201 : 200);
}

async function update(req, res) {
  const { id } = req.params;
  const { limit, type, percent, currency } = req.body || {};

  const updated = await store.write((data) => {
    const budget = findById(data.budgets, id);
    if (!budget) {
      throw new AppError(404, 'Budget not found');
    }
    if (limit != null) {
      const value = Number(limit);
      if (!isFinite(value) || value < 0) {
        throw new AppError(400, 'Invalid limit');
      }
      budget.limit = value;
    }
    if (type != null) {
      if (!['fixed', 'percent'].includes(String(type))) {
        throw new AppError(400, 'Invalid budget type');
      }
      budget.type = String(type);
    }
    if (percent != null) {
      const value = Number(percent);
      if (!isFinite(value) || value < 0 || value > 100) {
        throw new AppError(400, 'Invalid percent');
      }
      budget.percent = value;
    }
    if (currency != null) {
      if (!ALLOWED_CURRENCIES.includes(String(currency))) {
        throw new AppError(400, 'Invalid currency');
      }
      budget.currency = String(currency);
    }
    return budget;
  });

  return success(res, updated);
}

module.exports = {
  list,
  createOrUpdate,
  update,
};
