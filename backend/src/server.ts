// backend/src/server.ts
// ENHANCED: Improved security, error handling, and configuration validation

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

// Load environment variables first
dotenv.config();

// Enhanced imports
import { validateEnvironmentVariables } from './utils/validateEnv';
import { sequelize } from './config/database.config';
import { 
  errorHandler, 
  notFoundHandler, 
  handleUncaughtExceptions,
  asyncHandler 
} from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import userRoutes from './routes/user.routes';
import predictionRoutes from './routes/prediction.routes';
import adminRoutes from './routes/admin.routes';

import logger from './utils/logger';

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
      fontSrc: ["'self'"],
      connectSrc: ["'self'", config.ML_SERVICE_URL]
    }
  },
  crossOriginEmbedderPolicy: false // Required for some development tools
}));

// Enhanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      config.FRONTEND_URL,
      'http://localhost:3000', // Development frontend
      'http://localhost:3001'  // Alternative dev port
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced rate limiting
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
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
    });
  }
});

app.use(limiter);

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================

app.use(compression());

// Enhanced logging with request ID
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving (minimal for demo)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1h',
  etag: true
}));

// Request ID middleware for better debugging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(2, 15);
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================

// Health check with comprehensive status
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const dbStatus = await sequelize.authenticate()
    .then(() => 'healthy')
    .catch(() => 'unhealthy');

  const healthStatus = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    services: {
      database: dbStatus,
      api: 'healthy'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mode: 'dev-test',
    features: {
      backgroundJobs: 'disabled',
      fileUploads: 'disabled',
      mlPredictions: 'enabled'
    }
  };

  res.status(dbStatus === 'healthy' ? 200 : 503).json(healthStatus);
}));

// API documentation endpoint (development only)
if (config.NODE_ENV === 'development') {
  app.get('/api-docs', (req: Request, res: Response) => {
    res.json({
      title: 'Timely API Documentation',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        products: '/api/products/*',
        cart: '/api/cart/*',
        orders: '/api/orders/*',
        user: '/api/user/*',
        predictions: '/api/predictions/*',
        admin: '/api/admin/*'
      },
      healthCheck: '/health',
      documentation: 'See README.md for detailed API documentation'
    });
  });
}

// API Routes with proper error handling
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', authMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/predictions', authMiddleware, predictionRoutes);
app.use('/api/admin', adminRoutes); // Auth middleware applied within admin routes

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = createServer(app);

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`, {
        port: PORT,
        environment: config.NODE_ENV,
        apiUrl: `http://localhost:${PORT}`,
        healthCheck: `http://localhost:${PORT}/health`
      });
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

// ============================================================================
// ENHANCEMENTS IMPLEMENTED:
// 
// 1. Environment variable validation before startup
// 2. Enhanced security headers and CORS configuration
// 3. Comprehensive error handling with proper categorization
// 4. Request ID tracking for better debugging
// 5. Detailed health check endpoint
// 6. Graceful shutdown handling
// 7. Enhanced rate limiting with proper logging
// 8. Security-focused middleware configuration
// 9. Development-only API documentation endpoint
// 10. Improved logging throughout the application
// ============================================================================