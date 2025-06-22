// backend/src/middleware/error.middleware.ts
// ENHANCED: Comprehensive error handling with proper categorization and logging

import { Request, Response, NextFunction } from 'express';
import { ValidationError as SequelizeValidationError } from 'sequelize';
import logger from '@/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  errors?: any[];
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err };
  error.message = err.message;

  // Log all errors with context
  const errorContext = {
    message: error.message,
    statusCode: error.statusCode || 500,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  // Enhanced error categorization and handling
  if (err.name === 'SequelizeValidationError' || err instanceof SequelizeValidationError) {
    const message = 'Validation Error';
    const errors = (err as any).errors?.map((error: any) => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    error = new CustomError(message, 400, true, 'VALIDATION_ERROR');
    error.errors = errors;
    logger.warn('Sequelize validation error:', { ...errorContext, validationErrors: errors });
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Resource already exists';
    error = new CustomError(message, 409, true, 'DUPLICATE_RESOURCE');
    logger.warn('Unique constraint violation:', errorContext);
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference to related resource';
    error = new CustomError(message, 400, true, 'INVALID_REFERENCE');
    logger.warn('Foreign key constraint violation:', errorContext);
  } else if (err.name === 'SequelizeDatabaseError') {
    const message = 'Database operation failed';
    error = new CustomError(message, 500, false, 'DATABASE_ERROR');
    logger.error('Database error:', errorContext);
  } else if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid authentication token';
    error = new CustomError(message, 401, true, 'INVALID_TOKEN');
    logger.warn('JWT error:', errorContext);
  } else if (err.name === 'TokenExpiredError') {
    const message = 'Authentication token expired';
    error = new CustomError(message, 401, true, 'TOKEN_EXPIRED');
    logger.warn('Token expired:', errorContext);
  } else if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new CustomError(message, 400, true, 'INVALID_ID');
    logger.warn('Cast error:', errorContext);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    error = new CustomError(message, 400, true, 'FILE_TOO_LARGE');
    logger.warn('File size limit exceeded:', errorContext);
  } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    const message = 'External service unavailable';
    error = new CustomError(message, 503, true, 'SERVICE_UNAVAILABLE');
    logger.error('External service error:', errorContext);
  } else {
    // Log unhandled errors as critical
    if (!error.isOperational) {
      logger.error('CRITICAL - Unhandled error:', errorContext);
    } else {
      logger.error('Operational error:', errorContext);
    }
  }

  // Determine response based on environment and error type
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = error.statusCode || 500;
  
  // Security: Don't leak internal errors in production
  const message = error.isOperational 
    ? error.message 
    : (isDevelopment ? error.message : 'An unexpected error occurred');

  // Construct error response
  const errorResponse: any = {
    success: false,
    error: message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Add additional details in development
  if (isDevelopment) {
    errorResponse.stack = error.stack;
    if (error.errors) {
      errorResponse.details = error.errors;
    }
  }

  // Add validation errors if present
  if (error.errors && error.code === 'VALIDATION_ERROR') {
    errorResponse.details = error.errors;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to avoid try-catch in every route
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404, true, 'ROUTE_NOT_FOUND');
  next(error);
};

// Unhandled promise rejection handler
export const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });
};