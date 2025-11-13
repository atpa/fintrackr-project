const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { getNextId, findById } = require('../utils/dataHelpers');
const BANKS = require('../utils/banks');

async function connections(req, res) {
  const connectionsList = await store.read((data) => data.bankConnections || []);
  return success(res, connectionsList);
}

async function connect(req, res) {
  const { bank_id, account_id, login, password } = req.body || {};
  const bankId = Number(bank_id);
  let accountId = Number(account_id);
  if (!bankId) {
    throw new AppError(400, 'Missing bank_id');
  }

  const connection = await store.write((data) => {
    let targetAccount = findById(data.accounts, accountId);
    if (!targetAccount) {
      if (!data.accounts.length) {
        throw new AppError(400, 'Нет доступных счетов');
      }
      targetAccount = data.accounts[0];
      accountId = targetAccount.id;
    }

    const bank = BANKS.find((item) => item.id === bankId);
    if (!bank) {
      throw new AppError(404, 'Банк не найден');
    }

    const newConn = {
      id: getNextId(data.bankConnections),
      bank_id: bank.id,
      bank_name: bank.name,
      account_id: targetAccount.id,
      login: login || '',
      created_at: new Date().toISOString(),
    };
    data.bankConnections.push(newConn);
    return newConn;
  });

  return success(res, connection, 201);
}

async function syncTransactions(req, res) {
  const { connection_id } = req.body || {};
  const connId = Number(connection_id);
  if (!connId) {
    throw new AppError(400, 'Missing connection_id');
  }

  const result = await store.write((data) => {
    const connection = findById(data.bankConnections, connId);
    if (!connection) {
      throw new AppError(404, 'Connection not found');
    }
    const account = findById(data.accounts, connection.account_id);
    if (!account) {
      throw new AppError(404, 'Account not found');
    }

    const categories = data.categories.filter((category) => category.kind === 'expense' || !category.kind);
    if (!categories.length) {
      throw new AppError(400, 'No expense categories available');
    }

    const created = [];
    for (let i = 0; i < 3; i += 1) {
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const amount = Math.round(Math.random() * 100 + 10);
      const date = new Date().toISOString().slice(0, 10);
      const tx = {
        id: getNextId(data.transactions),
        account_id: account.id,
        category_id: randomCategory ? randomCategory.id : null,
        type: 'expense',
        amount,
        currency: account.currency || 'USD',
        date,
        note: `Синхронизация банка ${connection.bank_name}`,
      };
      data.transactions.push(tx);
      account.balance = Number(account.balance) - amount;
      created.push(tx);
    }

    return created;
  });

  return success(res, { synced: result.length, transactions: result }, 201);
}

module.exports = {
  connections,
  connect,
  syncTransactions,
};
