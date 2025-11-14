/**
 * Atomic transaction helper (Mongo only; graceful fallback for JSON mode)
 * Использование:
 * const { runAtomic } = require('./db/atomic');
 * await runAtomic(async ({ session, db }) => { ... });
 */

const { ENV } = require('../config/constants');
const { getClient, getDb } = require('./connection');

async function runAtomic(workFn) {
  // JSON режим / нет БД
  if (!ENV.USE_DB) {
    return await workFn({ session: null, db: null, atomic: false });
  }
  const client = getClient();
  if (!client || client.stub) {
    return await workFn({ session: null, db: getDb(), atomic: false });
  }
  if (client.startSession == null) {
    // Драйвер не полностью доступен — fallback
    return await workFn({ session: null, db: getDb(), atomic: false });
  }
  const session = client.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const db = getDb();
      result = await workFn({ session, db, atomic: true });
    });
  } finally {
    await session.endSession();
  }
  return result;
}

module.exports = { runAtomic };
