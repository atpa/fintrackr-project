const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { getNextId, findById } = require('../utils/dataHelpers');

async function list(req, res) {
  const rules = await store.read((data) => data.rules || []);
  return success(res, rules);
}

async function create(req, res) {
  const { keyword, category_id } = req.body || {};
  if (!keyword || typeof category_id !== 'number') {
    throw new AppError(400, 'Missing rule parameters');
  }

  const rule = await store.write((data) => {
    const newRule = {
      id: getNextId(data.rules),
      keyword: String(keyword).toLowerCase(),
      category_id: Number(category_id),
    };
    data.rules.push(newRule);
    return newRule;
  });

  return success(res, rule, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { keyword, category_id } = req.body || {};

  const updated = await store.write((data) => {
    const rule = findById(data.rules, id);
    if (!rule) {
      throw new AppError(404, 'Rule not found');
    }
    if (keyword != null) {
      rule.keyword = String(keyword).toLowerCase();
    }
    if (category_id != null) {
      rule.category_id = Number(category_id);
    }
    return rule;
  });

  return success(res, updated);
}

async function remove(req, res) {
  const { id } = req.params;

  await store.write((data) => {
    const index = data.rules.findIndex((rule) => Number(rule.id) === Number(id));
    if (index === -1) {
      throw new AppError(404, 'Rule not found');
    }
    data.rules.splice(index, 1);
    return { id: Number(id) };
  });

  return success(res, { id: Number(id) });
}

module.exports = {
  list,
  create,
  update,
  remove,
};
