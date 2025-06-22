// backend/src/middleware/auth.middleware.ts
// ENHANCED: Improved security with user validation and better error handling

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { User, UserRole } from '../models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication attempt without token.', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
      userId: string; 
      email: string; 
      role: UserRole; 
      iat: number; 
      exp: number 
    };

    // ENHANCED: Active user validation for better security
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      logger.warn(`Authentication failed for inactive or non-existent user ID: ${decoded.userId}`, {
        userId: decoded.userId,
        userExists: !!user,
        isActive: user?.isActive,
        ip: req.ip
      });
      return res.status(401).json({ error: 'User not found or account inactive.' });
    }

    // Verify user data matches token
    if (user.email !== decoded.email || user.role !== decoded.role) {
      logger.warn(`Token data mismatch for user ${decoded.userId}`, {
        tokenEmail: decoded.email,
        userEmail: user.email,
        tokenRole: decoded.role,
        userRole: user.role
      });
      return res.status(401).json({ error: 'Token data mismatch.' });
    }

    // Attach validated user information to the request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    // Update last activity (optional - can be removed if too frequent)
    if (Math.random() < 0.1) { // Update 10% of requests to avoid too many DB writes
      user.update({ lastLoginAt: new Date() }).catch(err => 
        logger.error('Failed to update last activity:', err)
      );
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication token expired.', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ error: 'Token expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('Invalid authentication token.', { 
        error: error.message,
        ip: req.ip 
      });
      return res.status(401).json({ error: 'Invalid token.' });
    }
    logger.error('Authentication error:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip
    });
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    logger.error('Admin middleware called without authentication middleware');
    return res.status(500).json({ error: 'Internal server error.' });
  }

  if (req.user.role !== UserRole.ADMIN) {
    logger.warn(`Non-admin user attempted admin access: ${req.user.id}`, {
      userId: req.user.id,
      userRole: req.user.role,
      path: req.path,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
};

export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    return next();
  }

  // Token provided, validate it
  try {
    await authMiddleware(req, res, next);
  } catch (error) {
    // If token is invalid, continue without authentication rather than failing
    logger.info('Optional auth failed, continuing without authentication', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next();
  }
};