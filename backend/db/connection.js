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
    return null; // JSON mode — работа через файл data.json
  }
  if (_client) return _client; // singleton reuse

  const backend = ENV.DB_BACKEND || 'mongo';
  if (backend === 'mongo') {
    _driver = 'mongo';
    let MongoClient;
    try {
      MongoClient = require('mongodb').MongoClient;
    } catch (e) {
      console.warn('MongoDB driver not installed. Run: npm install mongodb');
      // Fallback stub (не падаем, чтобы не ломать тесты пока)
      _client = { backend: 'mongo', connected: false, stub: true, db() { return { collection: () => ({}) }; } };
      return _client;
    }
    const uri = process.env.MONGO_URL || 'mongodb://localhost:27017/fintrackr';
    _client = new MongoClient(uri, { ignoreUndefined: true });
    try {
      await _client.connect();
      console.log('[DB] Mongo connected');
    } catch (err) {
      console.error('[DB] Mongo connection failed:', err.message);
      throw err;
    }
    return _client;
  } else if (backend === 'pg') {
    _driver = 'pg';
    console.warn('Postgres backend not yet implemented. Falling back to stub.');
    _client = { backend: 'pg', connected: false, stub: true };
    return _client;
  } else {
    throw new Error(`Unsupported DB_BACKEND: ${backend}`);
  }
}

function getClient() { return _client; }

function getDb() {
  if (!_client || _driver !== 'mongo') return null;
  if (_client.stub) return null;
  return _client.db();
}

async function disconnect() {
  if (_client) {
    // Mongo: await _client.close();
    // PG: await _client.end();
    _client = null;
    _driver = null;
  }
}

module.exports = { connect, disconnect, getClient, getDb };
