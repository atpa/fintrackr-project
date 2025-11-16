/**
 * Subscriptions routes
 * Handles CRUD operations for recurring subscriptions
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const {
  getSubscriptionsByUserId,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} = require('../services/dataService.new');

router.use(authenticateRequest);

function toClientModel(sub) {
  if (!sub) return null;
  return {
    id: sub.id,
    title: sub.title,
    amount: Number(sub.amount),
    currency: sub.currency,
    frequency: sub.frequency,
    nextDate: sub.next_date,
  };
}

router.get('/', (req, res) => {
  const rows = getSubscriptionsByUserId(req.user.userId);
  res.json(rows.map(toClientModel));
});

router.post('/', (req, res) => {
  const { title, amount, currency = 'USD', frequency, next_date: nextDate } = req.body || {};
  if (!title || !frequency || !nextDate || amount === undefined) {
    return res.status(400).json({ error: 'title, amount, frequency and next_date are required' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const id = createSubscription(
    req.user.userId,
    String(title).trim(),
    numericAmount,
    String(currency || 'USD').toUpperCase(),
    String(frequency),
    nextDate
  );
  const created = getSubscriptionById(id);
  res.status(201).json(toClientModel(created));
});

router.put('/:id', (req, res) => {
  const subscription = getSubscriptionById(req.params.id);
  if (!subscription || subscription.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  const updates = {};
  ['title', 'currency', 'frequency', 'next_date'].forEach((field) => {
    if (req.body && req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });
  if (req.body && req.body.amount !== undefined) {
    const numericAmount = Number(req.body.amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    updates.amount = numericAmount;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updateSubscription(subscription.id, updates);
  const updated = getSubscriptionById(subscription.id);
  res.json(toClientModel(updated));
});

router.delete('/:id', (req, res) => {
  const subscription = getSubscriptionById(req.params.id);
  if (!subscription || subscription.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  deleteSubscription(subscription.id);
  res.json({ success: true });
});

module.exports = router;
