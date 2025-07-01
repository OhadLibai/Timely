// backend/src/server.ts

// IMPORTANT: Alias configuration is now handled in app.ts
// We still import it here to ensure it runs first if this file is the entry point.
import './alias';

import { createServer } from 'http';
import dotenv from 'dotenv';
import logger from '@/utils/logger';

// Import the configured Express app
import app from './app';

// Import database and exception handlers
import { sequelize } from '@/config/database.config';
import { handleUncaughtExceptions } from '@/middleware/error.middleware';

// Load environment variables
dotenv.config();

// ============================================================================
// INITIALIZATION
// ============================================================================

// Setup uncaught exception handlers
handleUncaughtExceptions();

const PORT = process.env.PORT || 5000;
const server = createServer(app);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    // 1. Test database connection
    logger.info('Connecting to the database...');
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully.');

    // 2. Start the HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}`);
      logger.info(`💊 Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = () => {
  logger.info('🔄 Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    logger.info('✅ HTTP server closed.');
    
    sequelize.close().then(() => {
      logger.info('✅ Database connection closed.');
      process.exit(0);
    }).catch((error) => {
      logger.error('❌ Error closing database connection:', error);
      process.exit(1);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('❌ Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 30000);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
startServer();