/**
 * Budgets Routes
 * API endpoints for budget management
 */

const { budgetsRepo, categoriesRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/budgets
 * Get all budgets for authenticated user
 */
async function getBudgets(req, res) {
  const userId = req.user.id;
  const budgets = budgetsRepo.findByUserId(userId);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(budgets));
}

/**
 * GET /api/budgets/:id
 * Get single budget by ID
 */
async function getBudget(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const budget = budgetsRepo.findById(id);

  if (!budget || budget.user_id !== userId) {
    throw new HttpError("Budget not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(budget));
}

/**
 * POST /api/budgets
 * Create new budget
 */
async function createBudget(req, res) {
  const userId = req.user.id;
  const { category_id, month, limit, currency } = req.body;

  // Validation
  if (!category_id || !month || limit == null || !currency) {
    throw new HttpError("Missing required fields", 400);
  }

  // Check category exists and belongs to user
  const category = categoriesRepo.findById(category_id);
  if (!category || category.user_id !== userId) {
    throw new HttpError("Category not found", 404);
  }

  // Check if budget already exists
  const existing = budgetsRepo.findByCategoryAndMonth(userId, category_id, month);
  if (existing) {
    throw new HttpError("Budget for this category and month already exists", 400);
  }

  // Create budget
  const budget = budgetsRepo.create({
    user_id: userId,
    category_id: Number(category_id),
    month,
    limit: Number(limit),
    spent: 0,
    currency,
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(budget));
}

/**
 * PUT /api/budgets/:id
 * Update budget
 */
async function updateBudget(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = budgetsRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Budget not found", 404);
  }

  const updated = budgetsRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/budgets/:id
 * Delete budget
 */
async function deleteBudget(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const budget = budgetsRepo.findById(id);
  if (!budget || budget.user_id !== userId) {
    throw new HttpError("Budget not found", 404);
  }

  budgetsRepo.delete(id);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
};
