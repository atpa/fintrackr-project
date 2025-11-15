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
const { initDB } = require('./services/dataService.new');

const PORT = process.env.PORT || 3000;

// Initialize database connection
try {
  initDB();
  console.log('✅ Database initialized');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  console.error('Run: npm run db:init to migrate from data.json');
  process.exit(1);
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 FinTrackr server running on http://localhost:${PORT}`);
  console.log(`📊 Using SQLite database at: backend/fintrackr.db`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
