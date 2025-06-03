// backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Include stack in dev
  });
};