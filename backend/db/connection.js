/**
 * DB Connection Module (Draft)
 * Supports lazy initialization for MongoDB or PostgreSQL (future).
 * For now provides a unified async interface returning mock handles.
 */

const { ENV } = require("../config/constants");

let _client = null;
let _driver = null;

async function connect() {
  if (!ENV.USE_DB) {
    return null; // JSON mode
  }
  if (_client) return _client;

  const backend = ENV.DB_BACKEND || "mongo"; // 'mongo' | 'pg'
  if (backend === "mongo") {
    // Placeholder: would import { MongoClient } from 'mongodb'
    _driver = "mongo";
    _client = { backend: "mongo", connected: true };
  } else if (backend === "pg") {
    _driver = "pg";
    _client = { backend: "pg", connected: true };
  } else {
    throw new Error(`Unsupported DB_BACKEND: ${backend}`);
  }
  return _client;
}

function getClient() {
  return _client;
}

async function disconnect() {
  if (_client) {
    // Real implementation would close driver connection
    _client = null;
    _driver = null;
  }
}

module.exports = {
  connect,
  disconnect,
  getClient,
};
