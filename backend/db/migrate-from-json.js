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

  // In real implementation each section would perform bulk inserts.
  // Here we only log counts and prepare pseudo operations.
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
  report.forEach(r => {
    console.log(`INSERT ${r.collection} (${r.count} rows)`);
  });

  console.log('\nMigration draft complete. Implement real DB layer next.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
