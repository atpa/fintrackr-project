/**
 * Goals Routes
 * API endpoints for financial goal management
 */

const { goalsRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/goals
 * Get all goals for authenticated user
 */
async function getGoals(req, res) {
  const userId = req.user.id;
  const goals = goalsRepo.findAll().filter((g) => g.user_id === userId);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(goals));
}

/**
 * GET /api/goals/:id
 * Get single goal by ID
 */
async function getGoal(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const goal = goalsRepo.findById(id);

  if (!goal || goal.user_id !== userId) {
    throw new HttpError("Goal not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(goal));
}

/**
 * POST /api/goals
 * Create new goal
 */
async function createGoal(req, res) {
  const userId = req.user.id;
  const { name, target_amount, current_amount, currency, deadline } = req.body;

  // Validation
  if (!name || target_amount == null || !currency) {
    throw new HttpError("Missing required fields", 400);
  }

  // Create goal
  const goal = goalsRepo.create({
    user_id: userId,
    name,
    target_amount: Number(target_amount),
    current_amount: current_amount != null ? Number(current_amount) : 0,
    currency,
    deadline: deadline || null,
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(goal));
}

/**
 * PUT /api/goals/:id
 * Update goal
 */
async function updateGoal(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = goalsRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Goal not found", 404);
  }

  const updated = goalsRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/goals/:id
 * Delete goal
 */
async function deleteGoal(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const goal = goalsRepo.findById(id);
  if (!goal || goal.user_id !== userId) {
    throw new HttpError("Goal not found", 404);
  }

  goalsRepo.delete(id);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
};
