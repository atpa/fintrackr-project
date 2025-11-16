/**
 * FinTrackr Server Entry Point
 * Starts the Express application with HTTP server
 * 
 * This is the new entry point that uses:
 * - Express framework (app.js)
 * - SQLite database (dataService.new.js)
 * - Modern routers and middleware
 * 
 * Replaces: backend/server.js (legacy monolithic HTTP server)
 */

const app = require('./app');
const { initDB, getDB } = require('./services/dataService.new');
const { ENV } = require('./config/constants');
const { performHealthCheck, checkpointWAL } = require('./utils/dbHealthCheck');

const PORT = process.env.PORT || 3000;

// Validate environment configuration
function validateEnvironment() {
  const warnings = [];
  
  // Check JWT secret in production
  if (process.env.NODE_ENV === 'production' && ENV.JWT_SECRET === 'dev-secret-change') {
    warnings.push('⚠️  WARNING: Using default JWT_SECRET in production! Set a unique secret.');
  }
  
  // Check cookie configuration
  if (process.env.NODE_ENV === 'production') {
    if (!ENV.COOKIE_SECURE) {
      warnings.push('⚠️  WARNING: COOKIE_SECURE is not enabled. Cookies should be secure in production.');
    }
    if (ENV.COOKIE_SAMESITE !== 'Strict' && ENV.COOKIE_SAMESITE !== 'Lax') {
      warnings.push(`⚠️  WARNING: COOKIE_SAMESITE is set to "${ENV.COOKIE_SAMESITE}". Use "Strict" or "Lax" for better security.`);
    }
  }
  
  return warnings;
}

// Initialize database connection
let db;
try {
  db = initDB();
  console.log('✅ Database initialized');
  
  // Perform health check if database is available
  if (db && !ENV.DISABLE_PERSIST) {
    performHealthCheck(db);
  }
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  console.error('Run: npm run db:init to migrate from data.json');
  process.exit(1);
}

// Validate environment
const envWarnings = validateEnvironment();
if (envWarnings.length > 0) {
  envWarnings.forEach(warning => console.log(warning));
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 FinTrackr server running on http://localhost:${PORT}`);
  if (ENV.DISABLE_PERSIST) {
    console.log('📊 Using in-memory SQLite database (persistence disabled)');
  } else {
    console.log(`📊 Using SQLite database at: backend/fintrackr.db`);
  }
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  
  // Checkpoint WAL before shutdown to prevent lock issues
  if (db && !ENV.DISABLE_PERSIST) {
    console.log('Performing WAL checkpoint...');
    const result = checkpointWAL(db);
    if (result.success) {
      console.log('✅ WAL checkpoint completed');
    } else {
      console.error('❌ WAL checkpoint failed:', result.error);
    }
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connection
    if (db) {
      try {
        db.close();
        console.log('✅ Database connection closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
    }
    
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
