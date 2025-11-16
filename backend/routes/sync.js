/**
 * Bank sync routes
 * Handles bank connection listing and simulated transaction sync
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const {
  getBankConnectionsByUserId,
  getBankConnectionById,
  createBankConnection,
  deleteBankConnection,
  getAccountById,
} = require('../services/dataService.new');
const { BANKS, MOCK_BANK_TRANSACTIONS } = require('../config/constants');

router.use(authenticateRequest);

function resolveBank(bankId) {
  return BANKS.find((bank) => Number(bank.id) === Number(bankId));
}

router.get('/connections', (req, res) => {
  const rows = getBankConnectionsByUserId(req.user.userId);
  const mapped = rows.map((conn) => {
    const bank = resolveBank(conn.bank_id) || { name: 'Unknown bank' };
    const account = conn.account_id ? getAccountById(conn.account_id) : null;
    return {
      id: conn.id,
      bank_id: conn.bank_id,
      bank_name: bank.name,
      account_id: conn.account_id,
      account_name: conn.account_name || account?.name || 'Linked account',
      status: conn.status || 'active',
      created_at: conn.created_at,
    };
  });
  res.json(mapped);
});

router.post('/connect', (req, res) => {
  const { bank_id: bankId, account_id: accountId, login, password } = req.body || {};
  if (!bankId || !accountId || !login || !password) {
    return res.status(400).json({ error: 'bank_id, account_id, login and password are required' });
  }
  const bank = resolveBank(bankId);
  if (!bank) {
    return res.status(400).json({ error: 'Unknown bank id' });
  }
  const account = getAccountById(Number(accountId));
  if (!account || account.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Account not found or access denied' });
  }
  const id = createBankConnection(
    req.user.userId,
    bankId,
    account.id,
    `${account.name} (${account.currency})`
  );
  const created = getBankConnectionById(id);
  res.status(201).json({
    id: created.id,
    bank_id: created.bank_id,
    bank_name: bank.name,
    account_id: created.account_id,
    account_name: created.account_name,
  });
});

router.post('/transactions', (req, res) => {
  const { connection_id: connectionId } = req.body || {};
  if (!connectionId) {
    return res.status(400).json({ error: 'connection_id is required' });
  }
  const connection = getBankConnectionById(Number(connectionId));
  if (!connection || connection.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  const mock = MOCK_BANK_TRANSACTIONS[connection.bank_id] || [];
  const transactions = mock.map((tx) => ({
    date: tx.date,
    description: tx.description,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    category: tx.category?.name || null,
    category_kind: tx.category?.kind || null,
  }));
  res.json({
    synced: transactions.length,
    transactions,
  });
});

router.delete('/connections/:id', (req, res) => {
  const connection = getBankConnectionById(Number(req.params.id));
  if (!connection || connection.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  deleteBankConnection(connection.id);
  res.json({ success: true });
});

module.exports = router;
