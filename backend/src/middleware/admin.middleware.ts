// backend/src/middleware/admin.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware'; // Uses the extended Request type
import logger from '../utils/logger';
import { UserRole } from '../models/user.model'; // Import UserRole if not already

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== UserRole.ADMIN) { // Use UserRole.ADMIN
    logger.warn(`Admin access denied for user: ${req.user?.email || 'Unknown user'}`);
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  next();
};