const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { ALLOWED_CURRENCIES } = require('../utils/constants');
const { getNextId, findById } = require('../utils/dataHelpers');

async function list(req, res) {
  const accounts = await store.read((data) => data.accounts);
  return success(res, accounts);
}

async function create(req, res) {
  const { name, currency, balance } = req.body || {};
  if (!name || !currency) {
    throw new AppError(400, 'Missing account parameters');
  }
  if (typeof balance !== 'undefined' && !isFinite(Number(balance))) {
    throw new AppError(400, 'Invalid balance');
  }
  if (!ALLOWED_CURRENCIES.includes(String(currency))) {
    throw new AppError(400, 'Invalid currency');
  }

  const newAccount = await store.write((data) => {
    const account = {
      id: getNextId(data.accounts),
      name: String(name),
      currency: String(currency),
      balance: Number(balance) || 0,
    };
    data.accounts.push(account);
    return account;
  });

  return success(res, newAccount, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { name, currency, balance } = req.body || {};

  const updated = await store.write((data) => {
    const account = findById(data.accounts, id);
    if (!account) {
      throw new AppError(404, 'Account not found');
    }
    if (name != null) {
      account.name = String(name);
    }
    if (currency != null) {
      if (!ALLOWED_CURRENCIES.includes(String(currency))) {
        throw new AppError(400, 'Invalid currency');
      }
      account.currency = String(currency);
    }
    if (balance != null) {
      const value = Number(balance);
      if (!isFinite(value)) {
        throw new AppError(400, 'Invalid balance');
      }
      account.balance = value;
    }
    return account;
  });

  return success(res, updated);
}

async function remove(req, res) {
  const { id } = req.params;

  await store.write((data) => {
    const index = data.accounts.findIndex((account) => Number(account.id) === Number(id));
    if (index === -1) {
      throw new AppError(404, 'Account not found');
    }
    data.accounts.splice(index, 1);
    // Удаляем связанные транзакции и плановые операции
    data.transactions = data.transactions.filter((tx) => tx.account_id !== Number(id));
    data.planned = data.planned.filter((item) => item.account_id !== Number(id));
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
