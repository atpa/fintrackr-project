/**
 * Database Health Check Utilities
 * Monitors SQLite connection health and WAL mode status
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'fintrackr.db');

/**
 * Check if database files exist and are accessible
 * @returns {Object} Health check result
 */
function checkDatabaseFiles() {
  const result = {
    healthy: true,
    issues: [],
    warnings: []
  };

  // Check main database file
  if (!fs.existsSync(dbPath)) {
    result.healthy = false;
    result.issues.push('Database file does not exist');
    return result;
  }

  try {
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    result.healthy = false;
    result.issues.push('Database file is not readable/writable');
  }

  // Check for WAL and SHM files
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';

  if (!fs.existsSync(walPath)) {
    result.warnings.push('WAL file not found - database may not be in WAL mode');
  }

  if (!fs.existsSync(shmPath)) {
    result.warnings.push('SHM file not found - shared memory may not be initialized');
  }

  return result;
}

/**
 * Validate database connection and WAL mode
 * @param {Database} db - better-sqlite3 database instance
 * @returns {Object} Validation result
 */
function validateDatabaseConnection(db) {
  const result = {
    connected: false,
    walMode: false,
    foreignKeys: false,
    issues: []
  };

  try {
    // Test connection
    const testQuery = db.prepare('SELECT 1 as test');
    testQuery.get();
    result.connected = true;

    // Check journal mode
    const journalMode = db.pragma('journal_mode', { simple: true });
    result.walMode = journalMode === 'wal';
    if (!result.walMode) {
      result.issues.push(`Database is not in WAL mode (current: ${journalMode})`);
    }

    // Check foreign keys
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    result.foreignKeys = foreignKeys === 1;
    if (!result.foreignKeys) {
      result.issues.push('Foreign keys are not enabled');
    }

  } catch (error) {
    result.issues.push(`Connection test failed: ${error.message}`);
  }

  return result;
}

/**
 * Force WAL checkpoint to prevent lock issues
 * Should be called periodically or on shutdown
 * @param {Database} db - better-sqlite3 database instance
 * @returns {Object} Checkpoint result
 */
function checkpointWAL(db) {
  try {
    // RESTART mode: checkpoint and restart the WAL
    const result = db.pragma('wal_checkpoint(RESTART)');
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('[WAL Checkpoint] Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get database statistics
 * @param {Database} db - better-sqlite3 database instance
 */
function getDatabaseStats(db) {
  try {
    const pageCount = db.pragma('page_count', { simple: true });
    const pageSize = db.pragma('page_size', { simple: true });
    const walAutocheckpoint = db.pragma('wal_autocheckpoint', { simple: true });
    
    return {
      sizeBytes: pageCount * pageSize,
      pageCount,
      pageSize,
      walAutocheckpoint
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Comprehensive database health check
 * @param {Database} db - better-sqlite3 database instance
 */
function performHealthCheck(db) {
  console.log('\n[Database Health Check]');
  
  const fileCheck = checkDatabaseFiles();
  console.log('File check:', fileCheck.healthy ? '✅ Healthy' : '❌ Issues found');
  if (fileCheck.issues.length > 0) {
    console.log('  Issues:', fileCheck.issues);
  }
  if (fileCheck.warnings.length > 0) {
    console.log('  Warnings:', fileCheck.warnings);
  }

  if (db) {
    const connCheck = validateDatabaseConnection(db);
    console.log('Connection:', connCheck.connected ? '✅ Connected' : '❌ Disconnected');
    console.log('WAL mode:', connCheck.walMode ? '✅ Enabled' : '⚠️  Disabled');
    console.log('Foreign keys:', connCheck.foreignKeys ? '✅ Enabled' : '⚠️  Disabled');
    
    if (connCheck.issues.length > 0) {
      console.log('  Issues:', connCheck.issues);
    }

    const stats = getDatabaseStats(db);
    if (!stats.error) {
      console.log('Database size:', (stats.sizeBytes / 1024 / 1024).toFixed(2), 'MB');
    }
  }

  console.log('');

  return {
    fileCheck,
    connectionCheck: db ? validateDatabaseConnection(db) : null
  };
}

module.exports = {
  checkDatabaseFiles,
  validateDatabaseConnection,
  checkpointWAL,
  getDatabaseStats,
  performHealthCheck
};
