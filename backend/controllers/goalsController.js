const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { getNextId, findById } = require('../utils/dataHelpers');

async function list(req, res) {
  const goals = await store.read((data) => data.goals);
  return success(res, goals);
}

async function create(req, res) {
  const { title, target_amount, current_amount, deadline } = req.body || {};
  if (!title || target_amount == null) {
    throw new AppError(400, 'Missing goal parameters');
  }

  const goal = await store.write((data) => {
    const newGoal = {
      id: getNextId(data.goals),
      title: String(title),
      target_amount: Number(target_amount),
      current_amount: Number(current_amount) || 0,
      deadline: deadline || null,
    };
    data.goals.push(newGoal);
    return newGoal;
  });

  return success(res, goal, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { title, target_amount, current_amount, deadline } = req.body || {};

  const updated = await store.write((data) => {
    const goal = findById(data.goals, id);
    if (!goal) {
      throw new AppError(404, 'Goal not found');
    }
    if (title != null) {
      goal.title = String(title);
    }
    if (target_amount != null) {
      const value = Number(target_amount);
      if (!isFinite(value) || value < 0) {
        throw new AppError(400, 'Invalid target_amount');
      }
      goal.target_amount = value;
    }
    if (current_amount != null) {
      const value = Number(current_amount);
      if (!isFinite(value) || value < 0) {
        throw new AppError(400, 'Invalid current_amount');
      }
      goal.current_amount = value;
    }
    if (deadline !== undefined) {
      goal.deadline = deadline || null;
    }
    return goal;
  });

  return success(res, updated);
}

module.exports = {
  list,
  create,
  update,
};
