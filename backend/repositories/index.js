/**
 * Repository exports
 * Centralized export of all repositories
 */

const BaseRepository = require("./BaseRepository");
const TransactionsRepository = require("./TransactionsRepository");
const AccountsRepository = require("./AccountsRepository");
const BudgetsRepository = require("./BudgetsRepository");
const UsersRepository = require("./UsersRepository");

// Create repository instances
const transactionsRepo = new TransactionsRepository();
const accountsRepo = new AccountsRepository();
const budgetsRepo = new BudgetsRepository();
const usersRepo = new UsersRepository();

// Simple repositories (using BaseRepository)
const categoriesRepo = new BaseRepository("categories");
const goalsRepo = new BaseRepository("goals");
const plannedRepo = new BaseRepository("planned");
const subscriptionsRepo = new BaseRepository("subscriptions");
const rulesRepo = new BaseRepository("rules");

module.exports = {
  // Repository classes
  BaseRepository,
  TransactionsRepository,
  AccountsRepository,
  BudgetsRepository,
  UsersRepository,

  // Repository instances
  transactionsRepo,
  accountsRepo,
  budgetsRepo,
  usersRepo,
  categoriesRepo,
  goalsRepo,
  plannedRepo,
  subscriptionsRepo,
  rulesRepo,
};
