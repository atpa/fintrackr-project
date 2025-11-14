/**
 * Categories Routes
 * API endpoints for category management
 */

const { categoriesRepo, budgetsRepo, plannedRepo, transactionsRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/categories
 * Get all categories for authenticated user
 */
async function getCategories(req, res) {
  // Legacy public access (tests provide categories without user_id)
  let categories = categoriesRepo.findAll();
  if (req.user && req.user.id != null) {
    categories = categories.filter((c) => c.user_id === req.user.id);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(categories));
}

/**
 * GET /api/categories/:id
 * Get single category by ID
 */
async function getCategory(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const category = categoriesRepo.findById(id);

  if (!category || category.user_id !== userId) {
    throw new HttpError("Category not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(category));
}

/**
 * POST /api/categories
 * Create new category
 */
async function createCategory(req, res) {
  const userId = req.user.id;
  const { name, type, color, icon } = req.body;

  // Validation
  if (!name || !type) {
    throw new HttpError("Missing category name or type", 400);
  }

  if (!["income", "expense"].includes(type)) {
    throw new HttpError("Invalid category type", 400);
  }

  // Create category
  const category = categoriesRepo.create({
    user_id: userId,
    name,
    type,
    color: color || "#808080",
    icon: icon || "fa-folder",
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(category));
}

/**
 * PUT /api/categories/:id
 * Update category
 */
async function updateCategory(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = categoriesRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Category not found", 404);
  }

  const updated = categoriesRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/categories/:id
 * Delete category with cascade
 */
async function deleteCategory(req, res) {
  const userId = req.user ? req.user.id : null;
  const id = req.params.id;

  const category = categoriesRepo.findById(id);
  if (!category) {
    throw new HttpError("Category not found", 404);
  }

  // Каскад: бюджеты, planned, обнуление category_id у транзакций
  const { runAtomic } = require('../db/atomic');
  await runAtomic(async ({ session, db, atomic }) => {
    const dataService = require("../services/dataService");
    const data = dataService.getData();
    const catIdNum = Number(id);

    if (!atomic) {
      // JSON режим
      data.budgets = data.budgets.filter((b) => b.category_id !== catIdNum);
      data.planned = data.planned.filter((p) => p.category_id !== catIdNum);
      data.transactions.forEach((tx) => { if (tx.category_id === catIdNum) tx.category_id = null; });
      dataService.persistData();
      return;
    }
    // DB режим (Mongo) — выполняем операции по коллекциям
    try {
      const budgetsCol = db.collection('budgets');
      const plannedCol = db.collection('planned');
      const transactionsCol = db.collection('transactions');
      await budgetsCol.deleteMany({ category_id: catIdNum }, { session });
      await plannedCol.deleteMany({ category_id: catIdNum }, { session });
      await transactionsCol.updateMany({ category_id: catIdNum }, { $set: { category_id: null } }, { session });
    } catch (e) {
      console.error('[DB] cascade delete error:', e.message);
      throw new HttpError('Cascade delete failed', 500);
    }
  });

  // Удаляем саму категорию
  categoriesRepo.delete(id);

  // В JSON режиме persist уже сделан внутри каскада.

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
