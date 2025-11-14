/**
 * Planned Operations Routes
 * API endpoints for planned operation management
 */

const { plannedRepo, categoriesRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/planned
 * Get all planned operations for authenticated user
 */
async function getPlannedOperations(req, res) {
  const userId = req.user.id;
  const planned = plannedRepo.findAll().filter((p) => p.user_id === userId);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(planned));
}

/**
 * GET /api/planned/:id
 * Get single planned operation by ID
 */
async function getPlannedOperation(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const planned = plannedRepo.findById(id);

  if (!planned || planned.user_id !== userId) {
    throw new HttpError("Planned operation not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(planned));
}

/**
 * POST /api/planned
 * Create new planned operation
 */
async function createPlannedOperation(req, res) {
  const userId = req.user.id;
  const { category_id, amount, currency, date, note } = req.body;

  // Validation
  if (!category_id || amount == null || !currency || !date) {
    throw new HttpError("Missing required fields", 400);
  }

  // Check category exists and belongs to user
  const category = categoriesRepo.findById(category_id);
  if (!category || category.user_id !== userId) {
    throw new HttpError("Category not found", 404);
  }

  // Create planned operation
  const planned = plannedRepo.create({
    user_id: userId,
    category_id: Number(category_id),
    amount: Number(amount),
    currency,
    date,
    note: note || "",
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(planned));
}

/**
 * PUT /api/planned/:id
 * Update planned operation
 */
async function updatePlannedOperation(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = plannedRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Planned operation not found", 404);
  }

  const updated = plannedRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/planned/:id
 * Delete planned operation
 */
async function deletePlannedOperation(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const planned = plannedRepo.findById(id);
  if (!planned || planned.user_id !== userId) {
    throw new HttpError("Planned operation not found", 404);
  }

  plannedRepo.delete(id);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getPlannedOperations,
  getPlannedOperation,
  createPlannedOperation,
  updatePlannedOperation,
  deletePlannedOperation,
};
