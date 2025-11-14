/**
 * Rules Routes
 * API endpoints for automatic transaction rule management
 */

const { rulesRepo, categoriesRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/rules
 * Get all rules for authenticated user
 */
async function getRules(req, res) {
  const userId = req.user.id;
  const rules = rulesRepo.findAll().filter((r) => r.user_id === userId);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(rules));
}

/**
 * GET /api/rules/:id
 * Get single rule by ID
 */
async function getRule(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const rule = rulesRepo.findById(id);

  if (!rule || rule.user_id !== userId) {
    throw new HttpError("Rule not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(rule));
}

/**
 * POST /api/rules
 * Create new rule
 */
async function createRule(req, res) {
  const userId = req.user.id;
  const { pattern, category_id, note } = req.body;

  // Validation
  if (!pattern || !category_id) {
    throw new HttpError("Missing pattern or category", 400);
  }

  // Check category exists and belongs to user
  const category = categoriesRepo.findById(category_id);
  if (!category || category.user_id !== userId) {
    throw new HttpError("Category not found", 404);
  }

  // Create rule
  const rule = rulesRepo.create({
    user_id: userId,
    pattern,
    category_id: Number(category_id),
    note: note || "",
    active: true,
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(rule));
}

/**
 * PUT /api/rules/:id
 * Update rule
 */
async function updateRule(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = rulesRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Rule not found", 404);
  }

  const updated = rulesRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/rules/:id
 * Delete rule
 */
async function deleteRule(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const rule = rulesRepo.findById(id);
  if (!rule || rule.user_id !== userId) {
    throw new HttpError("Rule not found", 404);
  }

  rulesRepo.delete(id);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
};
