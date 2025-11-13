const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { getNextId, findById } = require('../utils/dataHelpers');

async function list(req, res) {
  const categories = await store.read((data) => data.categories);
  return success(res, categories);
}

async function create(req, res) {
  const { name, kind } = req.body || {};
  if (!name || !kind) {
    throw new AppError(400, 'Missing category parameters');
  }
  if (!['income', 'expense'].includes(String(kind))) {
    throw new AppError(400, 'Invalid category kind');
  }

  const category = await store.write((data) => {
    const newCategory = {
      id: getNextId(data.categories),
      name: String(name),
      kind: String(kind),
    };
    data.categories.push(newCategory);
    return newCategory;
  });

  return success(res, category, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { name, kind } = req.body || {};

  const updated = await store.write((data) => {
    const category = findById(data.categories, id);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }
    if (name != null) {
      category.name = String(name);
    }
    if (kind != null) {
      if (!['income', 'expense'].includes(String(kind))) {
        throw new AppError(400, 'Invalid category kind');
      }
      category.kind = String(kind);
    }
    return category;
  });

  return success(res, updated);
}

async function remove(req, res) {
  const { id } = req.params;

  await store.write((data) => {
    const catId = Number(id);
    const index = data.categories.findIndex((category) => Number(category.id) === catId);
    if (index === -1) {
      throw new AppError(404, 'Category not found');
    }
    data.categories.splice(index, 1);
    data.budgets = data.budgets.filter((budget) => budget.category_id !== catId);
    data.planned = data.planned.filter((plan) => plan.category_id !== catId);
    data.transactions.forEach((transaction) => {
      if (transaction.category_id === catId) {
        transaction.category_id = null;
      }
    });
    return { id: catId };
  });

  return success(res, { id: Number(id) });
}

module.exports = {
  list,
  create,
  update,
  remove,
};
