// backend/src/server.ts
// IMPORTANT: Import alias configuration first, before any other imports
import './alias';

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Now we can use clean absolute imports with @/ aliases
import { validateEnvironmentVariables } from '@/utils/validateEnv';
import { sequelize } from '@/config/database.config';
import { 
  errorHandler, 
  notFoundHandler, 
  handleUncaughtExceptions,
  asyncHandler 
} from '@/middleware/error.middleware';
import { authMiddleware } from '@/middleware/auth.middleware';

// Import routes with clean aliases
import authRoutes from '@/routes/auth.routes';
import productRoutes from '@/routes/product.routes';
import cartRoutes from '@/routes/cart.routes';
import orderRoutes from '@/routes/order.routes';
import userRoutes from '@/routes/user.routes';
import predictionRoutes from '@/routes/prediction.routes';
import adminRoutes from '@/routes/admin.routes';

import logger from '@/utils/logger';

// ============================================================================
// INITIALIZATION & VALIDATION
// ============================================================================

// Setup uncaught exception handlers
handleUncaughtExceptions();

// Validate environment variables
let config;
try {
  config = validateEnvironmentVariables();
  logger.info('🚀 Starting Timely Backend API...');
} catch (error) {
  logger.error('❌ Environment validation failed:', error);
  process.exit(1);
}

const app: Application = express();
const PORT = config.PORT;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Enhanced helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", config.ML_SERVICE_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [config.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Request-ID'
  ]
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
    });
  }
});

app.use('/api/', limiter);

// ============================================================================
// MIDDLEWARE STACK
// ============================================================================

// Request parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(
  ':method :url :status :res[content-length] - :response-time ms :user-agent',
  {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }
));

// Request ID tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected', // Could add actual DB health check here
    services: {
      ml_service: config.ML_SERVICE_URL
    }
  });
});

// API routes with clean structure
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', authMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/predictions', authMiddleware, predictionRoutes);
app.use('/api/admin', adminRoutes);

// Development-only documentation endpoint
if (process.env.NODE_ENV === 'development') {
  app.get('/api/docs', (req: Request, res: Response) => {
    res.json({
      message: 'Timely API Documentation',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        products: '/api/products/*',
        cart: '/api/cart/*',
        orders: '/api/orders/*',
        users: '/api/users/*',
        predictions: '/api/predictions/*',
        admin: '/api/admin/*'
      },
      documentation: 'https://docs.timely.com/api'
    });
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler (must come after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = createServer(app);

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`💊 Health check: http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
      }
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('🔄 Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    logger.info('✅ HTTP server closed');
    
    sequelize.close().then(() => {
      logger.info('✅ Database connection closed');
      process.exit(0);
    }).catch((error) => {
      logger.error('❌ Error closing database connection:', error);
      process.exit(1);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
startServer();

export default app;