const crypto = require('crypto');
const store = require('../repositories/jsonStore');
const { success, AppError } = require('../utils/responses');
const { getNextId } = require('../utils/dataHelpers');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    throw new AppError(400, 'Missing registration parameters');
  }

  const user = await store.write((data) => {
    const exists = data.users.find((u) => u.email === email);
    if (exists) {
      throw new AppError(400, 'User already exists');
    }
    const newUser = {
      id: getNextId(data.users),
      name: String(name),
      email: String(email),
      password_hash: hashPassword(password),
    };
    data.users.push(newUser);
    const { password_hash, ...publicUser } = newUser;
    return publicUser;
  });

  return success(res, user, 201);
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw new AppError(400, 'Missing login parameters');
  }

  const user = await store.read((data) => data.users.find((u) => u.email === email));
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }
  const hash = hashPassword(password);
  if (hash !== user.password_hash) {
    throw new AppError(401, 'Invalid email or password');
  }
  const { password_hash, ...publicUser } = user;
  return success(res, publicUser);
}

module.exports = {
  register,
  login,
};
