// backend/src/routes/user.routes.ts
// SIMPLIFIED: Basic user operations only - removed complex preference management

import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const userController = new UserController();

// ============================================================================
// CORE USER PROFILE OPERATIONS
// ============================================================================

// Get user profile
router.get(
  '/profile',
  userController.getProfile
);

// Update user profile (simplified)
router.put(
  '/profile',
  [
    body('firstName').optional().notEmpty().trim().isString(),
    body('lastName').optional().notEmpty().trim().isString(),
    body('phone').optional().isMobilePhone('any'),
    // Simplified preferences - only core ML-related settings
    body('preferences.autoBasketEnabled').optional().isBoolean(),
    body('preferences.autoBasketDay').optional().isInt({ min: 0, max: 6 }),
    body('preferences.autoBasketTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  ],
  validateRequest,
  userController.updateProfile
);

// ============================================================================
// BASIC FAVORITES OPERATIONS
// ============================================================================

// Get user favorites
router.get(
  '/favorites',
  userController.getFavorites
);

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
router.get(
  '/favorites/ids',
  userController.getFavoriteIds
);

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
// PREDICTION PREFERENCES (Core ML settings only)
// ============================================================================

// Get user prediction preferences
router.get(
  '/preferences',
  userController.getUserPreferences
);

// Update user prediction preferences
router.put(
  '/preferences',
  [
    body('autoBasketEnabled').optional().isBoolean(),
    body('autoBasketDay').optional().isInt({ min: 0, max: 6 }),
    body('autoBasketTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('minConfidenceThreshold').optional().isFloat({ min: 0, max: 1 }),
    body('maxBasketSize').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  userController.updateUserPreferences
);

// ============================================================================
// REMOVED COMPLEX FEATURES:
// - Advanced favorite list management
// - Complex user preference fields (dietary restrictions, brands, etc.)
// - Favorite list sharing and collaboration
// - Import/export favorites
// - Favorite statistics and analytics
// - Advanced notification settings
// - Social features
// - Subscription management
// - Payment preferences
// - Address management (moved to checkout if needed)
//
// Focus is now on core user profile and simple favorites for ML demo purposes.
// ============================================================================

export default router;