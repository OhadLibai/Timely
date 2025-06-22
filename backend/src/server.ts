// backend/src/server.ts
// SIMPLIFIED: Removed cron jobs - all actions are now user-initiated for demos

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

dotenv.config();

import { sequelize } from './config/database.config';

// Import routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import userRoutes from './routes/user.routes';
import predictionRoutes from './routes/prediction.routes';
import adminRoutes from './routes/admin.routes';
// REMOVED: import deliveryRoutes from './routes/delivery.routes';

import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// REMOVED: Background job imports
// import './jobs/cartGeneration.job';
// import './jobs/metrics.job';

import logger from './utils/logger';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (if any legacy files exist)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================================================
// ROUTES SETUP
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: 'dev-test',
    backgroundJobs: 'disabled' // Indicates no cron jobs running
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', authMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/predictions', authMiddleware, predictionRoutes);
app.use('/api/admin', adminRoutes); // Auth middleware applied within admin routes

// REMOVED: Delivery routes (simplifies checkout process)
// app.use('/api/delivery', authMiddleware, deliveryRoutes);

// Catch-all route
app.get('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');

    // Sync database models (in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database models synchronized');
    }

    // Start HTTP server
    const server = createServer(app);
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🎯 Mode: dev-test (user-initiated actions only)`);
      logger.info(`⏰ Background jobs: DISABLED`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        sequelize.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// ============================================================================
// REMOVED FEATURES:
// - cartGeneration.job.ts (automatic basket generation)
// - metrics.job.ts (background metrics collection)
// - Any other cron/scheduled tasks
// - Delivery route integration
//
// All functionality is now user-initiated:
// - Basket generation via "Generate Basket" button
// - Metrics via "Evaluate Model" button in admin panel  
// - Orders via manual checkout process
//
// This creates a clean, controlled demo environment where every action
// is triggered by user interaction, making it perfect for demonstrations.
// ============================================================================