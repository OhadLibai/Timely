// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '@/controllers/auth.controller';
import { validateRequest } from '@/middleware/validation.middleware';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('phone').optional().isMobilePhone('any')
  ],
  validateRequest,
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validateRequest,
  authController.login
);

// Refresh token
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty()
  ],
  validateRequest,
  authController.refreshToken
);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Get current user
router.get('/me', authMiddleware, authController.getCurrentUser);

// Request password reset
router.post(
  '/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  validateRequest,
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
  ],
  validateRequest,
  authController.resetPassword
);

// Change password
router.put(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  validateRequest,
  authController.changePassword
);

export default router;