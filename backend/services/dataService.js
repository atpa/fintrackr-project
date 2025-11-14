/**
 * Data persistence utilities
 * Handles reading and writing to JSON storage
 */

const fs = require("fs");
const path = require("path");
const { ENV } = require("../config/constants");

const dataPath = path.join(__dirname, "..", "data.json");

/**
 * Apply default structure to data object
 */
function applyDataDefaults(target) {
  if (!target.users) target.users = [];
  if (!target.accounts) target.accounts = [];
  if (!target.categories) target.categories = [];
  if (!target.transactions) target.transactions = [];
  if (!target.budgets) target.budgets = [];
  if (!target.goals) target.goals = [];
  if (!target.planned) target.planned = [];
  if (!target.subscriptions) target.subscriptions = [];
  if (!target.rules) target.rules = [];
  if (!target.recurring) target.recurring = [];
  if (!target.refreshTokens) target.refreshTokens = [];
  if (!target.tokenBlacklist) target.tokenBlacklist = [];
  return target;
}

/**
 * Load data from JSON file
 */
function loadData() {
  try {
    if (!fs.existsSync(dataPath)) {
      return applyDataDefaults({});
    }
    const raw = fs.readFileSync(dataPath, "utf-8");
    const parsed = JSON.parse(raw);
    return applyDataDefaults(parsed);
  } catch (err) {
    console.error("Error loading data:", err);
    return applyDataDefaults({});
  }
}

let data = loadData();
const defaultUserId =
  data.users && data.users.length > 0 ? data.users[0].id : null;

/**
 * Save data to JSON file
 */
function persistData() {
  if (ENV.DISABLE_PERSIST) return;
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error persisting data:", err);
  }
}

/**
 * Get current data object
 */
function getData() {
  return data;
}

/**
 * Replace data object (useful for testing)
 */
function setData(nextData) {
  data = applyDataDefaults(nextData);
  persistData();
}

/**
 * Get next available ID for a collection
 */
function getNextId(collection) {
  if (!collection || collection.length === 0) return 1;
  return Math.max(...collection.map((item) => item.id || 0)) + 1;
}

module.exports = {
  getData,
  setData,
  persistData,
  getNextId,
  defaultUserId,
};
