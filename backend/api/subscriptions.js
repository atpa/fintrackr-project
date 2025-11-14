/**
 * Subscriptions Routes
 * API endpoints for subscription management
 */

const { subscriptionsRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/subscriptions
 * Get all subscriptions for authenticated user
 */
async function getSubscriptions(req, res) {
  const userId = req.user.id;
  const subscriptions = subscriptionsRepo.findAll().filter((s) => s.user_id === userId);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(subscriptions));
}

/**
 * GET /api/subscriptions/:id
 * Get single subscription by ID
 */
async function getSubscription(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const subscription = subscriptionsRepo.findById(id);

  if (!subscription || subscription.user_id !== userId) {
    throw new HttpError("Subscription not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(subscription));
}

/**
 * POST /api/subscriptions
 * Create new subscription
 */
async function createSubscription(req, res) {
  const userId = req.user.id;
  const { name, amount, currency, frequency, next_date } = req.body;

  // Validation
  if (!name || amount == null || !currency || !frequency || !next_date) {
    throw new HttpError("Missing required fields", 400);
  }

  if (!["monthly", "yearly"].includes(frequency)) {
    throw new HttpError("Invalid frequency (must be monthly or yearly)", 400);
  }

  // Create subscription
  const subscription = subscriptionsRepo.create({
    user_id: userId,
    name,
    amount: Number(amount),
    currency,
    frequency,
    next_date,
    active: true,
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(subscription));
}

/**
 * PUT /api/subscriptions/:id
 * Update subscription
 */
async function updateSubscription(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = subscriptionsRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Subscription not found", 404);
  }

  const updated = subscriptionsRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/subscriptions/:id
 * Delete subscription
 */
async function deleteSubscription(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const subscription = subscriptionsRepo.findById(id);
  if (!subscription || subscription.user_id !== userId) {
    throw new HttpError("Subscription not found", 404);
  }

  subscriptionsRepo.delete(id);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
};
