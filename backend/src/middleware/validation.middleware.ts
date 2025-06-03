// backend/src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, Result, ValidationError } from 'express-validator';
import logger from '../utils/logger';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: Result<ValidationError> = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};