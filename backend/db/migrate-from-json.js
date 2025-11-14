#!/usr/bin/env node
/**
 * Migration Script Draft: JSON -> Database
 * Usage: node backend/db/migrate-from-json.js
 * Requires: USE_DB=true and connection configured (future implementation)
 */

const path = require('path');
const fs = require('fs');
const { connect } = require('./connection');

async function loadJson() {
  const file = path.join(__dirname, '..', 'data.json');
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

async function migrate() {
  const data = await loadJson();
  const client = await connect();
  if (!client) {
    console.log('DB not enabled (set USE_DB=true)');
    process.exit(1);
  }
  console.log('Connected to DB backend =', client.backend);

  // Реализация: если клиент подключён и не stub — делаем реальные вставки.
  const isStub = client.stub;
  const collections = [
    'users','accounts','categories','transactions','budgets','goals','planned','subscriptions','rules','recurring','refreshTokens','tokenBlacklist','bankConnections'
  ];

  const report = [];
  collections.forEach(name => {
    const arr = data[name] || [];
    report.push({ collection: name, count: arr.length });
  });

  console.table(report);
  console.log('\nPseudo operations preview:');
  for (const r of report) {
    console.log(`INSERT ${r.collection} (${r.count} rows)`);
    if (!isStub) {
      const items = data[r.collection] || [];
      if (!Array.isArray(items) || items.length === 0) continue;
      try {
        const db = client.db();
        const col = db.collection(r.collection);
        // Сохраняем id как есть (число) для совместимости; добавляем timestamps если отсутствуют.
        const prepared = items.map(x => ({
          ...x,
          created_at: x.created_at || new Date(),
          updated_at: x.updated_at || new Date(),
        }));
        const result = await col.insertMany(prepared, { ordered: false });
        console.log(`  -> inserted ${result.insertedCount}`);
      } catch (e) {
        console.error(`  !! insert error in ${r.collection}:`, e.message);
      }
    }
  }

  console.log(`\nMigration ${isStub ? 'stub (no real driver)' : 'completed initial bulk load'}.`);
  if (isStub) {
    console.log('Install mongodb package and ensure MONGO_URL for real migration.');
  } else {
    console.log('Next: verify derived balances and budgets consistency.');
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
