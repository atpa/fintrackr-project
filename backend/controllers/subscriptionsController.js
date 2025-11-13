const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { ALLOWED_CURRENCIES, ALLOWED_FREQUENCIES } = require('../utils/constants');
const { getNextId, findById } = require('../utils/dataHelpers');

async function list(req, res) {
  const subscriptions = await store.read((data) => data.subscriptions || []);
  return success(res, subscriptions);
}

async function create(req, res) {
  const { title, amount, currency, frequency, next_date } = req.body || {};
  if (!title || amount == null || !currency || !frequency) {
    throw new AppError(400, 'Missing subscription parameters');
  }
  const value = Number(amount);
  if (!isFinite(value) || value < 0) {
    throw new AppError(400, 'Invalid amount');
  }
  if (!ALLOWED_CURRENCIES.includes(String(currency))) {
    throw new AppError(400, 'Invalid currency');
  }
  if (!ALLOWED_FREQUENCIES.includes(String(frequency))) {
    throw new AppError(400, 'Invalid frequency');
  }

  const subscription = await store.write((data) => {
    const item = {
      id: getNextId(data.subscriptions),
      title: String(title),
      amount: value,
      currency: String(currency),
      frequency: String(frequency),
      next_date: next_date || null,
    };
    data.subscriptions.push(item);
    return item;
  });

  return success(res, subscription, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { title, amount, currency, frequency, next_date } = req.body || {};

  const updated = await store.write((data) => {
    const subscription = findById(data.subscriptions, id);
    if (!subscription) {
      throw new AppError(404, 'Subscription not found');
    }
    if (title != null) {
      subscription.title = String(title);
    }
    if (amount != null) {
      const value = Number(amount);
      if (!isFinite(value) || value < 0) {
        throw new AppError(400, 'Invalid amount');
      }
      subscription.amount = value;
    }
    if (currency != null) {
      if (!ALLOWED_CURRENCIES.includes(String(currency))) {
        throw new AppError(400, 'Invalid currency');
      }
      subscription.currency = String(currency);
    }
    if (frequency != null) {
      if (!ALLOWED_FREQUENCIES.includes(String(frequency))) {
        throw new AppError(400, 'Invalid frequency');
      }
      subscription.frequency = String(frequency);
    }
    if (next_date !== undefined) {
      subscription.next_date = next_date || null;
    }
    return subscription;
  });

  return success(res, updated);
}

async function remove(req, res) {
  const { id } = req.params;

  await store.write((data) => {
    const index = data.subscriptions.findIndex((item) => Number(item.id) === Number(id));
    if (index === -1) {
      throw new AppError(404, 'Subscription not found');
    }
    data.subscriptions.splice(index, 1);
    return { id: Number(id) };
  });

  return success(res, { id: Number(id) });
}

module.exports = {
  list,
  create,
  update,
  remove,
};
