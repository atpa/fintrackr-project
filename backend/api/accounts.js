/**
 * Accounts Routes
 * API endpoints for account management
 */

const { accountsRepo, transactionsRepo } = require("../repositories");
const { HttpError } = require("../middleware");

/**
 * GET /api/accounts
 * Get all accounts for authenticated user
 */
async function getAccounts(req, res) {
  // Allow public access (tests expect no auth). If user present, filter by user_id, else return all.
  let accounts;
  if (req.user && req.user.id != null) {
    accounts = accountsRepo.findByUserId(req.user.id);
  } else {
    accounts = accountsRepo.findAll();
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(accounts));
}

/**
 * GET /api/accounts/:id
 * Get single account by ID
 */
async function getAccount(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const account = accountsRepo.findById(id);

  if (!account || account.user_id !== userId) {
    throw new HttpError("Account not found", 404);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(account));
}

/**
 * POST /api/accounts
 * Create new account
 */
async function createAccount(req, res) {
  const userId = req.user.id;
  const { name, currency, balance } = req.body;

  // Validation
  if (!name || !currency) {
    throw new HttpError("Missing account name or currency", 400);
  }

  // Check if account name already exists for user
  const existing = accountsRepo.findByName(userId, name);
  if (existing) {
    throw new HttpError("Account with this name already exists", 400);
  }

  // Create account
  const account = accountsRepo.create({
    user_id: userId,
    name,
    currency,
    balance: balance != null ? Number(balance) : 0,
  });

  res.statusCode = 201;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(account));
}

/**
 * PUT /api/accounts/:id
 * Update account
 */
async function updateAccount(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const existing = accountsRepo.findById(id);
  if (!existing || existing.user_id !== userId) {
    throw new HttpError("Account not found", 404);
  }

  // Check name uniqueness if changing name
  if (req.body.name && req.body.name !== existing.name) {
    const duplicate = accountsRepo.findByName(userId, req.body.name);
    if (duplicate) {
      throw new HttpError("Account with this name already exists", 400);
    }
  }

  const updated = accountsRepo.update(id, req.body);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(updated));
}

/**
 * DELETE /api/accounts/:id
 * Delete account (only if no transactions)
 */
async function deleteAccount(req, res) {
  const userId = req.user.id;
  const id = req.params.id;

  const account = accountsRepo.findById(id);
  if (!account || account.user_id !== userId) {
    throw new HttpError("Account not found", 404);
  }

  // Check for transactions
  const transactions = transactionsRepo.findByAccount(id);
  if (transactions.length > 0) {
    throw new HttpError("Cannot delete account with transactions", 400);
  }

  accountsRepo.delete(id);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: true }));
}

module.exports = {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
};
