// backend/src/routes/user.routes.ts
// UPDATED: Simplified validation to match new preference model

import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '@/controllers/user.controller';
import { validateRequest } from '@/middleware/validation.middleware';

const router = Router();
const userController = new UserController();

// ============================================================================
// CORE USER PROFILE OPERATIONS (Unchanged)
// ============================================================================

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile (basic fields only)
router.put(
  '/profile',
  [
    body('firstName').optional().notEmpty().trim().isString(),
    body('lastName').optional().notEmpty().trim().isString(),
    body('phone').optional().isMobilePhone('any')
  ],
  validateRequest,
  userController.updateProfile
);

// ============================================================================
// BASIC FAVORITES OPERATIONS (Unchanged)
// ============================================================================

// Get user favorites
router.get('/favorites', userController.getFavorites);

// Add product to favorites
router.post(
  '/favorites/add',
  [
    body('productId').isUUID().withMessage('Valid Product ID (UUID) is required'),
  ],
  validateRequest,
  userController.addFavorite
);

// Remove product from favorites
router.delete(
  '/favorites/:productId',
  [
    param('productId').isUUID().withMessage('Valid Product ID (UUID) is required'),
  ],
  validateRequest,
  userController.removeFavorite
);

// Get favorite product IDs only
router.get('/favorites/ids', userController.getFavoriteIds);

// Check if product is favorited
router.get(
  '/favorites/check/:productId',
  [
    param('productId').isUUID().withMessage('Valid Product ID (UUID) is required'),
  ],
  validateRequest,
  userController.isProductFavorited
);

// ============================================================================
// SIMPLIFIED PREDICTION PREFERENCES (Core ML settings only)
// ============================================================================

// Get user prediction preferences
router.get('/preferences', userController.getUserPreferences);

// Update user prediction preferences - SIMPLIFIED VALIDATION
router.put(
  '/preferences',
  [
    // Core ML prediction settings
    body('autoBasketEnabled')
      .optional()
      .isBoolean()
      .withMessage('autoBasketEnabled must be a boolean'),
    
    body('autoBasketDay')
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('autoBasketDay must be an integer between 0 (Sunday) and 6 (Saturday)'),
    
    body('autoBasketTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('autoBasketTime must be in HH:MM:SS format'),

    // Basic UI preferences
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('emailNotifications must be a boolean'),

    body('darkMode')
      .optional()
      .isBoolean()
      .withMessage('darkMode must be a boolean')
  ],
  validateRequest,
  userController.updateUserPreferences
);

export default router;

// ============================================================================
// REMOVED COMPLEX VALIDATION ROUTES:
// 
// - PUT /preferences/dietary - Dietary restrictions management
// - PUT /preferences/brands - Preferred brands management
// - PUT /preferences/delivery - Delivery preferences
// - PUT /preferences/budget - Budget limit settings
// - PUT /preferences/allergies - Allergy management
// - PUT /preferences/household - Household information
// - PUT /preferences/marketing - Marketing opt-in/out
// - PUT /preferences/analytics - Data analytics consent
// - PUT /preferences/localization - Language/currency/timezone
// 
// SIMPLIFIED TO CORE FUNCTIONALITY:
// 
// The remaining validation covers exactly what's needed for:
// 1. ML prediction scheduling (autoBasket* fields)
// 2. Basic notification preferences (emailNotifications)
// 3. Simple UI customization (darkMode)
// 
// This supports all 4 core demands while eliminating complexity:
// - Demand 1: User seeding and prediction (autoBasket settings)
// - Demand 2: Model evaluation (no preferences needed)
// - Demand 3: Individual prediction testing (no preferences needed)
// - Demand 4: User experience (UI preferences like darkMode)
// ============================================================================