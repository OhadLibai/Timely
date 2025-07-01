// backend/src/app.ts

// IMPORTANT: Import alias configuration first
import './alias';

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { validateEnvironmentVariables } from '@/utils/validateEnv';
import logger from '@/utils/logger';

// Import custom middleware
import {
  errorHandler,
  notFoundHandler,
} from '@/middleware/error.middleware';
import { authMiddleware } from '@/middleware/auth.middleware';

// Import routes
import authRoutes from '@/routes/auth.routes';
import productRoutes from '@/routes/product.routes';
import cartRoutes from '@/routes/cart.routes';
import orderRoutes from '@/routes/order.routes';
import userRoutes from '@/routes/user.routes';
import predictionRoutes from '@/routes/prediction.routes';
import adminRoutes from '@/routes/admin.routes';

// Validate environment variables
const config = validateEnvironmentVariables();

// Create Express app instance
const app: Application = express();

// ============================================================================
// SECURITY & CORE MIDDLEWARE
// ============================================================================

app.use(helmet({ /* ... helmet config ... */ }));
app.use(cors({
  origin: [config.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [ 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'X-Request-ID' ]
}));

const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  // ... rate limit config ...
});
app.use('/api/', limiter);

// ============================================================================
// MIDDLEWARE STACK
// ============================================================================

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan logging
app.use(morgan('dev', {
    stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Request ID tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', authMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/predictions', authMiddleware, predictionRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;