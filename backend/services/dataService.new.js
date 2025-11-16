/**
 * Data persistence utilities - SQLite version
 * Handles database operations with better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { ENV } = require("../config/constants");

const dbPath = path.join(__dirname, '..', 'fintrackr.db');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

let db = null;

/**
 * Initialize database connection
 */
function initDB() {
  if (db) return db;

  if (ENV.DISABLE_PERSIST) {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✅ In-memory database initialized with schema (persistence disabled)');
    ensureBankConnectionsAccountIdColumn(db);
    return db;
  }

  const dbExists = fs.existsSync(dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema if database is new
  if (!dbExists) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✅ Database initialized with schema');
  }
  ensureBankConnectionsAccountIdColumn(db);
  
  return db;
}

function ensureBankConnectionsAccountIdColumn(dbInstance) {
  try {
    const columns = dbInstance.prepare("PRAGMA table_info('bank_connections')").all();
    const hasAccountId = columns.some((col) => col.name === 'account_id');
    if (!hasAccountId) {
      dbInstance.prepare('ALTER TABLE bank_connections ADD COLUMN account_id INTEGER').run();
    }
  } catch (error) {
    console.warn('Failed to ensure bank_connections.account_id column:', error.message);
  }
}

/**
 * Get database instance
 */
function getDB() {
  if (!db) {
    initDB();
  }
  return db;
}

/**
 * Close database connection
 */
function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

// ==================== USERS ====================

function getAllUsers() {
  return getDB().prepare('SELECT * FROM users').all();
}

function getUserById(id) {
  return getDB().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserByEmail(email) {
  return getDB().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function createUser(name, email, passwordHash) {
  const stmt = getDB().prepare(`
    INSERT INTO users (name, email, password_hash)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(name, email, passwordHash);
  return result.lastInsertRowid;
}

function updateUser(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.password_hash);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  const stmt = getDB().prepare(`
    UPDATE users SET ${fields.join(', ')} WHERE id = ?
  `);
  return stmt.run(...values).changes > 0;
}

function deleteUser(id) {
  const stmt = getDB().prepare('DELETE FROM users WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== ACCOUNTS ====================

function getAllAccounts() {
  return getDB().prepare('SELECT * FROM accounts').all();
}

function getAccountById(id) {
  return getDB().prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function getAccountsByUserId(userId) {
  return getDB().prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
}

function createAccount(userId, name, currency, balance = 0) {
  const stmt = getDB().prepare(`
    INSERT INTO accounts (user_id, name, currency, balance)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(userId, name, currency, balance);
  return result.lastInsertRowid;
}

function updateAccount(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?');
    values.push(updates.currency);
  }
  if (updates.balance !== undefined) {
    fields.push('balance = ?');
    values.push(updates.balance);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  const stmt = getDB().prepare(`
    UPDATE accounts SET ${fields.join(', ')} WHERE id = ?
  `);
  return stmt.run(...values).changes > 0;
}

function deleteAccount(id) {
  const stmt = getDB().prepare('DELETE FROM accounts WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== CATEGORIES ====================

function getAllCategories() {
  return getDB().prepare('SELECT * FROM categories').all();
}

function getCategoryById(id) {
  return getDB().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function getCategoriesByUserId(userId) {
  return getDB().prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
}

function createCategory(userId, name, kind) {
  const stmt = getDB().prepare(`
    INSERT INTO categories (user_id, name, kind)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, name, kind);
  return result.lastInsertRowid;
}

function updateCategory(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.kind !== undefined) {
    fields.push('kind = ?');
    values.push(updates.kind);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  const stmt = getDB().prepare(`
    UPDATE categories SET ${fields.join(', ')} WHERE id = ?
  `);
  return stmt.run(...values).changes > 0;
}

function deleteCategory(id) {
  const stmt = getDB().prepare('DELETE FROM categories WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== TRANSACTIONS ====================

function getAllTransactions() {
  return getDB().prepare('SELECT * FROM transactions ORDER BY date DESC').all();
}

function getTransactionById(id) {
  return getDB().prepare('SELECT * FROM transactions WHERE id = ?').get(id);
}

function getTransactionsByUserId(userId) {
  return getDB().prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC').all(userId);
}

function getTransactionsByAccountId(accountId) {
  return getDB().prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC').all(accountId);
}

function createTransaction(userId, accountId, categoryId, type, amount, currency, date, note) {
  const stmt = getDB().prepare(`
    INSERT INTO transactions (user_id, account_id, category_id, type, amount, currency, date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, accountId, categoryId, type, amount, currency, date, note);
  return result.lastInsertRowid;
}

function updateTransaction(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.account_id !== undefined) {
    fields.push('account_id = ?');
    values.push(updates.account_id);
  }
  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?');
    values.push(updates.currency);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }
  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  const stmt = getDB().prepare(`
    UPDATE transactions SET ${fields.join(', ')} WHERE id = ?
  `);
  return stmt.run(...values).changes > 0;
}

function deleteTransaction(id) {
  const stmt = getDB().prepare('DELETE FROM transactions WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== BUDGETS ====================

function getAllBudgets() {
  return getDB().prepare('SELECT * FROM budgets').all();
}

function getBudgetById(id) {
  return getDB().prepare('SELECT * FROM budgets WHERE id = ?').get(id);
}

function getBudgetsByUserId(userId) {
  return getDB().prepare('SELECT * FROM budgets WHERE user_id = ?').all(userId);
}

function getBudgetByUserCategoryMonth(userId, categoryId, month) {
  return getDB().prepare(`
    SELECT * FROM budgets 
    WHERE user_id = ? AND category_id = ? AND month = ?
  `).get(userId, categoryId, month);
}

function createBudget(userId, categoryId, month, limitAmount, spent = 0, type = 'fixed', percent = null, currency = 'USD') {
  const stmt = getDB().prepare(`
    INSERT INTO budgets (user_id, category_id, month, limit_amount, spent, type, percent, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, categoryId, month, limitAmount, spent, type, percent, currency);
  return result.lastInsertRowid;
}

function updateBudget(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.limit_amount !== undefined) {
    fields.push('limit_amount = ?');
    values.push(updates.limit_amount);
  }
  if (updates.spent !== undefined) {
    fields.push('spent = ?');
    values.push(updates.spent);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.percent !== undefined) {
    fields.push('percent = ?');
    values.push(updates.percent);
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?');
    values.push(updates.currency);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  const stmt = getDB().prepare(`
    UPDATE budgets SET ${fields.join(', ')} WHERE id = ?
  `);
  return stmt.run(...values).changes > 0;
}

function deleteBudget(id) {
  const stmt = getDB().prepare('DELETE FROM budgets WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== GOALS ====================

function getAllGoals() {
  return getDB().prepare('SELECT * FROM goals').all();
}

function getGoalById(id) {
  return getDB().prepare('SELECT * FROM goals WHERE id = ?').get(id);
}

function getGoalsByUserId(userId) {
  return getDB().prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);
}

function createGoal(userId, title, targetAmount, currentAmount = 0, deadline = null) {
  const stmt = getDB().prepare(`
    INSERT INTO goals (user_id, title, target_amount, current_amount, deadline)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, title, targetAmount, currentAmount, deadline);
  return result.lastInsertRowid;
}

function updateGoal(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.target_amount !== undefined) {
    fields.push('target_amount = ?');
    values.push(updates.target_amount);
  }
  if (updates.current_amount !== undefined) {
    fields.push('current_amount = ?');
    values.push(updates.current_amount);
  }
  if (updates.deadline !== undefined) {
    fields.push('deadline = ?');
    values.push(updates.deadline);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  const stmt = getDB().prepare(`
    UPDATE goals SET ${fields.join(', ')} WHERE id = ?
  `);
  return stmt.run(...values).changes > 0;
}

function deleteGoal(id) {
  const stmt = getDB().prepare('DELETE FROM goals WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== SUBSCRIPTIONS ====================

function getSubscriptionsByUserId(userId) {
  return getDB()
    .prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY next_date')
    .all(userId);
}

function getSubscriptionById(id) {
  return getDB().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
}

function createSubscription(userId, title, amount, currency, frequency, nextDate) {
  const stmt = getDB().prepare(`
    INSERT INTO subscriptions (user_id, title, amount, currency, frequency, next_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, title, amount, currency, frequency, nextDate);
  return result.lastInsertRowid;
}

function updateSubscription(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?');
    values.push(updates.currency);
  }
  if (updates.frequency !== undefined) {
    fields.push('frequency = ?');
    values.push(updates.frequency);
  }
  if (updates.next_date !== undefined) {
    fields.push('next_date = ?');
    values.push(updates.next_date);
  }
  
  if (!fields.length) {
    return false;
  }
  
  values.push(id);
  const stmt = getDB().prepare(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`);
  return stmt.run(...values).changes > 0;
}

function deleteSubscription(id) {
  const stmt = getDB().prepare('DELETE FROM subscriptions WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== BANK CONNECTIONS ====================

function getBankConnectionsByUserId(userId) {
  return getDB()
    .prepare('SELECT * FROM bank_connections WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);
}

function getBankConnectionById(id) {
  return getDB().prepare('SELECT * FROM bank_connections WHERE id = ?').get(id);
}

function createBankConnection(userId, bankId, accountId, accountName, status = 'active') {
  const stmt = getDB().prepare(`
    INSERT INTO bank_connections (user_id, bank_id, account_id, account_name, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, bankId, accountId, accountName, status);
  return result.lastInsertRowid;
}

function updateBankConnection(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.account_name !== undefined) {
    fields.push('account_name = ?');
    values.push(updates.account_name);
  }
  if (updates.account_id !== undefined) {
    fields.push('account_id = ?');
    values.push(updates.account_id);
  }
  
  if (!fields.length) {
    return false;
  }
  
  values.push(id);
  const stmt = getDB().prepare(`UPDATE bank_connections SET ${fields.join(', ')} WHERE id = ?`);
  return stmt.run(...values).changes > 0;
}

function deleteBankConnection(id) {
  const stmt = getDB().prepare('DELETE FROM bank_connections WHERE id = ?');
  return stmt.run(id).changes > 0;
}

// ==================== REFRESH TOKENS ====================

function getRefreshToken(token) {
  return getDB().prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(token);
}

function getRefreshTokensByUserId(userId) {
  return getDB().prepare('SELECT * FROM refresh_tokens WHERE user_id = ?').all(userId);
}

function createRefreshToken(userId, token, expiresAt) {
  const stmt = getDB().prepare(`
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, token, expiresAt);
  return result.lastInsertRowid;
}

function deleteRefreshToken(token) {
  const stmt = getDB().prepare('DELETE FROM refresh_tokens WHERE token = ?');
  return stmt.run(token).changes > 0;
}

function deleteExpiredRefreshTokens() {
  const now = Date.now();
  const stmt = getDB().prepare('DELETE FROM refresh_tokens WHERE expires_at < ?');
  return stmt.run(now).changes;
}

// ==================== TOKEN BLACKLIST ====================

function isTokenBlacklisted(token) {
  const result = getDB().prepare('SELECT 1 FROM token_blacklist WHERE token = ?').get(token);
  return !!result;
}

function addTokenToBlacklist(token) {
  const stmt = getDB().prepare('INSERT INTO token_blacklist (token) VALUES (?)');
  try {
    stmt.run(token);
    return true;
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return true; // Already blacklisted
    }
    throw err;
  }
}

// ==================== SESSIONS ====================

function createSession(sessionData) {
  const stmt = getDB().prepare(`
    INSERT INTO sessions (user_id, refresh_token, device_info, ip_address, last_activity, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    sessionData.user_id,
    sessionData.refresh_token,
    sessionData.device_info || null,
    sessionData.ip_address || null,
    sessionData.last_activity || new Date().toISOString(),
    sessionData.created_at || new Date().toISOString()
  );
  return result.lastInsertRowid;
}

function getSessionById(sessionId) {
  return getDB().prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
}

function getSessionsByUserId(userId) {
  return getDB().prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY last_activity DESC').all(userId);
}

function getSessionByRefreshToken(refreshToken) {
  return getDB().prepare('SELECT * FROM sessions WHERE refresh_token = ?').get(refreshToken);
}

function updateSession(sessionId, updates) {
  const fields = [];
  const values = [];
  
  if (updates.last_activity !== undefined) {
    fields.push('last_activity = ?');
    values.push(updates.last_activity);
  }
  if (updates.ip_address !== undefined) {
    fields.push('ip_address = ?');
    values.push(updates.ip_address);
  }
  if (updates.device_info !== undefined) {
    fields.push('device_info = ?');
    values.push(updates.device_info);
  }
  
  if (fields.length === 0) return false;
  
  values.push(sessionId);
  const stmt = getDB().prepare(`
    UPDATE sessions SET ${fields.join(', ')} WHERE id = ?
  `);
  const result = stmt.run(...values);
  return result.changes > 0;
}

function deleteSession(sessionId) {
  const stmt = getDB().prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(sessionId);
  return result.changes > 0;
}

function deleteSessionsByUserId(userId) {
  const stmt = getDB().prepare('DELETE FROM sessions WHERE user_id = ?');
  const result = stmt.run(userId);
  return result.changes;
}

function getAllSessions() {
  return getDB().prepare('SELECT * FROM sessions ORDER BY last_activity DESC').all();
}

// ==================== LEGACY COMPATIBILITY ====================

/**
 * For backward compatibility with existing code that uses getData()
 * This will be gradually phased out
 */
function getData() {
  return {
    users: getAllUsers(),
    accounts: getAllAccounts(),
    categories: getAllCategories(),
    transactions: getAllTransactions(),
    budgets: getAllBudgets(),
    goals: getAllGoals(),
    refreshTokens: getDB().prepare('SELECT * FROM refresh_tokens').all(),
    tokenBlacklist: getDB().prepare('SELECT token FROM token_blacklist').all().map(r => r.token)
  };
}

/**
 * For testing - not recommended for production use
 */
function setData(data) {
  console.warn('setData() is deprecated with SQLite. Use individual insert functions.');
  // This is mainly for test compatibility
}

function persistData() {
  // No-op with SQLite (auto-persisted)
}

function getNextId(collection) {
  // Deprecated - SQLite handles auto-increment
  console.warn('getNextId() is deprecated with SQLite. IDs are auto-generated.');
  return null;
}

module.exports = {
  // Database management
  initDB,
  getDB,
  closeDB,
  
  // Users
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  
  // Accounts
  getAllAccounts,
  getAccountById,
  getAccountsByUserId,
  createAccount,
  updateAccount,
  deleteAccount,
  
  // Categories
  getAllCategories,
  getCategoryById,
  getCategoriesByUserId,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Transactions
  getAllTransactions,
  getTransactionById,
  getTransactionsByUserId,
  getTransactionsByAccountId,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  
  // Budgets
  getAllBudgets,
  getBudgetById,
  getBudgetsByUserId,
  getBudgetByUserCategoryMonth,
  createBudget,
  updateBudget,
  deleteBudget,
  
  // Goals
  getAllGoals,
  getGoalById,
  getGoalsByUserId,
  createGoal,
  updateGoal,
  deleteGoal,
  
  // Subscriptions
  getSubscriptionsByUserId,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  
  // Bank connections
  getBankConnectionsByUserId,
  getBankConnectionById,
  createBankConnection,
  updateBankConnection,
  deleteBankConnection,
  
  // Refresh tokens
  getRefreshToken,
  getRefreshTokensByUserId,
  createRefreshToken,
  deleteRefreshToken,
  deleteExpiredRefreshTokens,
  
  // Token blacklist
  isTokenBlacklisted,
  addTokenToBlacklist,
  
  // Sessions
  createSession,
  getSessionById,
  getSessionsByUserId,
  getSessionByRefreshToken,
  updateSession,
  deleteSession,
  deleteSessionsByUserId,
  getAllSessions,
  
  // Legacy compatibility (deprecated)
  getData,
  setData,
  persistData,
  getNextId,
  defaultUserId: 1 // Deprecated
};
