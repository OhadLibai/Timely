// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger'; // Assuming logger.ts is in backend/src/utils/
import { User } from '../models/user.model'; // To extend Request interface

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication attempt without token.');
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; role: string; iat: number; exp: number };


    // Attach user information to the request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    
    // Check if user exists and is active (optional, but good for security)
    // const user = await User.findByPk(decoded.userId);
    // if (!user || !user.isActive) {
    //   logger.warn(`Authentication failed for inactive or non-existent user ID: ${decoded.userId}`);
    //   return res.status(401).json({ error: 'User not found or account inactive.' });
    // }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication token expired.');
      return res.status(401).json({ error: 'Token expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('Invalid authentication token.', { error });
      return res.status(401).json({ error: 'Invalid token.' });
    }
    logger.error('Authentication error:', { error });
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};