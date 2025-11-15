/**
 * Database initialization and migration utility
 * Handles SQLite database setup and data migration from JSON
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'fintrackr.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const jsonDataPath = path.join(__dirname, '..', 'data.json');

/**
 * Initialize database with schema
 */
function initializeDatabase() {
  console.log('Initializing database...');
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Better concurrency
  db.pragma('foreign_keys = ON'); // Enforce foreign keys
  
  // Read and execute schema
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  
  console.log('✅ Database schema created successfully');
  return db;
}

/**
 * Migrate data from JSON file to SQLite
 */
function migrateFromJSON(db) {
  console.log('Migrating data from JSON...');
  
  if (!fs.existsSync(jsonDataPath)) {
    console.log('⚠️  No data.json found, skipping migration');
    return;
  }
  
  const jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf-8'));
  
  // Start transaction for atomic migration
  const migrate = db.transaction(() => {
    // Migrate users
    if (jsonData.users && jsonData.users.length > 0) {
      const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const user of jsonData.users) {
        insertUser.run(
          user.id,
          user.name,
          user.email,
          user.password_hash,
          user.created_at || new Date().toISOString()
        );
      }
      console.log(`✅ Migrated ${jsonData.users.length} users`);
    }
    
    // Migrate accounts
    if (jsonData.accounts && jsonData.accounts.length > 0) {
      const insertAccount = db.prepare(`
        INSERT INTO accounts (id, user_id, name, currency, balance)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const account of jsonData.accounts) {
        insertAccount.run(
          account.id,
          account.user_id,
          account.name,
          account.currency || 'USD',
          account.balance || 0
        );
      }
      console.log(`✅ Migrated ${jsonData.accounts.length} accounts`);
    }
    
    // Migrate categories
    if (jsonData.categories && jsonData.categories.length > 0) {
      const insertCategory = db.prepare(`
        INSERT INTO categories (id, user_id, name, kind)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const category of jsonData.categories) {
        insertCategory.run(
          category.id,
          category.user_id,
          category.name,
          category.kind
        );
      }
      console.log(`✅ Migrated ${jsonData.categories.length} categories`);
    }
    
    // Migrate transactions
    if (jsonData.transactions && jsonData.transactions.length > 0) {
      const insertTransaction = db.prepare(`
        INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, date, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const tx of jsonData.transactions) {
        insertTransaction.run(
          tx.id,
          tx.user_id,
          tx.account_id,
          tx.category_id || null,
          tx.type,
          tx.amount,
          tx.currency || 'USD',
          tx.date,
          tx.note || null
        );
      }
      console.log(`✅ Migrated ${jsonData.transactions.length} transactions`);
    }
    
    // Migrate budgets
    if (jsonData.budgets && jsonData.budgets.length > 0) {
      const insertBudget = db.prepare(`
        INSERT INTO budgets (id, user_id, category_id, month, limit_amount, spent, type, percent, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const budget of jsonData.budgets) {
        insertBudget.run(
          budget.id,
          budget.user_id,
          budget.category_id,
          budget.month,
          budget.limit || 0,
          budget.spent || 0,
          budget.type || 'fixed',
          budget.percent || null,
          budget.currency || 'USD'
        );
      }
      console.log(`✅ Migrated ${jsonData.budgets.length} budgets`);
    }
    
    // Migrate goals
    if (jsonData.goals && jsonData.goals.length > 0) {
      const insertGoal = db.prepare(`
        INSERT INTO goals (id, user_id, title, target_amount, current_amount, deadline)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const goal of jsonData.goals) {
        insertGoal.run(
          goal.id,
          goal.user_id,
          goal.title,
          goal.target_amount,
          goal.current_amount || 0,
          goal.deadline || null
        );
      }
      console.log(`✅ Migrated ${jsonData.goals.length} goals`);
    }
    
    // Migrate planned operations
    if (jsonData.planned && jsonData.planned.length > 0) {
      const insertPlanned = db.prepare(`
        INSERT INTO planned (id, user_id, account_id, category_id, type, amount, currency, start_date, frequency, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const plan of jsonData.planned) {
        insertPlanned.run(
          plan.id,
          plan.user_id,
          plan.account_id,
          plan.category_id || null,
          plan.type,
          plan.amount,
          plan.currency || 'USD',
          plan.start_date,
          plan.frequency,
          plan.note || null
        );
      }
      console.log(`✅ Migrated ${jsonData.planned.length} planned operations`);
    }
    
    // Migrate subscriptions
    if (jsonData.subscriptions && jsonData.subscriptions.length > 0) {
      const insertSubscription = db.prepare(`
        INSERT INTO subscriptions (id, user_id, title, amount, currency, frequency, next_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const sub of jsonData.subscriptions) {
        insertSubscription.run(
          sub.id,
          sub.user_id,
          sub.title,
          sub.amount,
          sub.currency || 'USD',
          sub.frequency,
          sub.next_date
        );
      }
      console.log(`✅ Migrated ${jsonData.subscriptions.length} subscriptions`);
    }
    
    // Migrate rules
    if (jsonData.rules && jsonData.rules.length > 0) {
      const insertRule = db.prepare(`
        INSERT INTO rules (id, user_id, pattern, category_id, confidence)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const rule of jsonData.rules) {
        insertRule.run(
          rule.id,
          rule.user_id,
          rule.pattern,
          rule.category_id,
          rule.confidence || 1.0
        );
      }
      console.log(`✅ Migrated ${jsonData.rules.length} rules`);
    }
    
    // Migrate recurring
    if (jsonData.recurring && jsonData.recurring.length > 0) {
      const insertRecurring = db.prepare(`
        INSERT INTO recurring (id, user_id, name, amount, frequency)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const rec of jsonData.recurring) {
        insertRecurring.run(
          rec.id,
          rec.user_id,
          rec.name,
          rec.amount,
          rec.frequency
        );
      }
      console.log(`✅ Migrated ${jsonData.recurring.length} recurring items`);
    }
    
    // Migrate bank connections
    if (jsonData.bankConnections && jsonData.bankConnections.length > 0) {
      const insertConnection = db.prepare(`
        INSERT INTO bank_connections (id, user_id, bank_id, account_name, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const conn of jsonData.bankConnections) {
        insertConnection.run(
          conn.id,
          conn.user_id,
          conn.bank_id,
          conn.account_name,
          conn.status || 'active'
        );
      }
      console.log(`✅ Migrated ${jsonData.bankConnections.length} bank connections`);
    }
    
    // Migrate refresh tokens
    if (jsonData.refreshTokens && jsonData.refreshTokens.length > 0) {
      const insertToken = db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `);
      
      for (const token of jsonData.refreshTokens) {
        insertToken.run(
          token.userId,
          token.token,
          token.expiresAt
        );
      }
      console.log(`✅ Migrated ${jsonData.refreshTokens.length} refresh tokens`);
    }
    
    // Migrate token blacklist
    if (jsonData.tokenBlacklist && jsonData.tokenBlacklist.length > 0) {
      const insertBlacklist = db.prepare(`
        INSERT INTO token_blacklist (token)
        VALUES (?)
      `);
      
      for (const token of jsonData.tokenBlacklist) {
        insertBlacklist.run(token);
      }
      console.log(`✅ Migrated ${jsonData.tokenBlacklist.length} blacklisted tokens`);
    }
  });
  
  migrate();
  console.log('✅ Data migration completed successfully');
  
  // Backup old JSON file
  const backupPath = jsonDataPath + '.backup.' + Date.now();
  fs.copyFileSync(jsonDataPath, backupPath);
  console.log(`✅ Original data backed up to ${backupPath}`);
}

/**
 * Main migration function
 */
function runMigration() {
  try {
    const db = initializeDatabase();
    migrateFromJSON(db);
    db.close();
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log(`Database created at: ${dbPath}`);
    console.log('\nNext steps:');
    console.log('1. Test the application with the new database');
    console.log('2. Update your deployment scripts to use SQLite');
    console.log('3. Remove data.json after confirming everything works');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  initializeDatabase,
  migrateFromJSON,
  runMigration
};
