const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { getNextId, findById } = require('../utils/dataHelpers');
const { ALLOWED_CURRENCIES } = require('../utils/constants');

async function list(req, res) {
  const planned = await store.read((data) => data.planned);
  return success(res, planned);
}

async function create(req, res) {
  const payload = req.body || {};
  const { account_id, category_id, type, amount, currency, start_date, frequency, note } = payload;

  if (!account_id || !category_id || !type || amount == null || !currency || !frequency) {
    throw new AppError(400, 'Missing planned operation parameters');
  }
  if (!['income', 'expense'].includes(String(type))) {
    throw new AppError(400, 'Invalid type');
  }
  if (!ALLOWED_CURRENCIES.includes(String(currency))) {
    throw new AppError(400, 'Invalid currency');
  }
  const value = Number(amount);
  if (!isFinite(value) || value < 0) {
    throw new AppError(400, 'Invalid amount');
  }

  const plannedItem = await store.write((data) => {
    const newItem = {
      id: getNextId(data.planned),
      account_id: Number(account_id),
      category_id: Number(category_id),
      type: String(type),
      amount: value,
      currency: String(currency),
      start_date: start_date || new Date().toISOString().slice(0, 10),
      frequency: String(frequency),
      note: note || '',
    };
    data.planned.push(newItem);
    return newItem;
  });

  return success(res, plannedItem, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const payload = req.body || {};

  const updated = await store.write((data) => {
    const plannedItem = findById(data.planned, id);
    if (!plannedItem) {
      throw new AppError(404, 'Planned not found');
    }
    if (payload.account_id != null) {
      plannedItem.account_id = Number(payload.account_id);
    }
    if (payload.category_id != null) {
      plannedItem.category_id = Number(payload.category_id);
    }
    if (payload.type != null) {
      if (!['income', 'expense'].includes(String(payload.type))) {
        throw new AppError(400, 'Invalid type');
      }
      plannedItem.type = String(payload.type);
    }
    if (payload.amount != null) {
      const value = Number(payload.amount);
      if (!isFinite(value) || value < 0) {
        throw new AppError(400, 'Invalid amount');
      }
      plannedItem.amount = value;
    }
    if (payload.currency != null) {
      if (!ALLOWED_CURRENCIES.includes(String(payload.currency))) {
        throw new AppError(400, 'Invalid currency');
      }
      plannedItem.currency = String(payload.currency);
    }
    if (payload.start_date !== undefined) {
      plannedItem.start_date = payload.start_date || null;
    }
    if (payload.frequency != null) {
      plannedItem.frequency = String(payload.frequency);
    }
    if (payload.note != null) {
      plannedItem.note = String(payload.note);
    }
    return plannedItem;
  });

  return success(res, updated);
}

module.exports = {
  list,
  create,
  update,
};
