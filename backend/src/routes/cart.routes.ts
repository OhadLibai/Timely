// backend/src/routes/cart.routes.ts
// CLEANED: Removed unimplemented coupon and save-for-later features

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { CartController } from '@/controllers/cart.controller';
import { validateRequest } from '@/middleware/validation.middleware';

const router = Router();
const cartController = new CartController();

// ============================================================================
// CORE CART OPERATIONS (Essential functionality only)
// ============================================================================

// Get current cart
router.get(
  '/',
  cartController.getCart
);

// Add item to cart
router.post(
  '/add',
  [
    body('productId').isUUID().withMessage('Product ID must be a valid UUID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
  ],
  validateRequest,
  cartController.addToCart
);

// Update cart item quantity
router.put(
  '/items/:itemId',
  [
    param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
  ],
  validateRequest,
  cartController.updateCartItem
);

// Remove item from cart
router.delete(
  '/items/:itemId',
  [
    param('itemId').isUUID().withMessage('Item ID must be a valid UUID')
  ],
  validateRequest,
  cartController.removeFromCart
);

// Clear entire cart
router.post(
  '/clear',
  cartController.clearCart
);

// ============================================================================
// ML INTEGRATION FEATURES (Core demands)
// ============================================================================

// Sync with predicted basket
router.post(
  '/sync-predicted/:basketId',
  [
    param('basketId').isUUID().withMessage('Basket ID must be a valid UUID')
  ],
  validateRequest,
  cartController.syncWithPredictedBasket
);

// Validate cart stock
router.post(
  '/validate',
  cartController.validateCart
);

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Merge guest cart (after login)
router.post(
  '/merge',
  [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.productId').isUUID().withMessage('Product ID must be a valid UUID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
  ],
  validateRequest,
  cartController.mergeGuestCart
);

// Get cart count (lightweight endpoint for header badge)
router.get(
  '/count',
  cartController.getCartCount
);

// Estimate shipping
router.post(
  '/estimate-shipping',
  [
    body('zipCode').notEmpty().trim().withMessage('Zip code is required'),
    body('country').optional().trim().withMessage('Country must be a string')
  ],
  validateRequest,
  cartController.estimateShipping
);

// Get cart recommendations
router.get(
  '/recommendations',
  [
    query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10')
  ],
  validateRequest,
  cartController.getCartRecommendations
);

export default router;

// ============================================================================
// REMOVED UNIMPLEMENTED FEATURES:
// 
// - POST /coupon (Apply coupon code) - applyCoupon controller method missing
// - DELETE /coupon (Remove coupon) - removeCoupon controller method missing  
// - POST /save-for-later/:itemId - saveForLater controller method missing
// - POST /move-to-cart/:itemId - moveToCart controller method broken (schema mismatch)
// - GET /saved (Get saved items) - getSavedItems controller method missing
//
// REASON FOR REMOVAL:
// These features are not implemented in the controller and not required for 
// the 4 core demands. Removing them eliminates API endpoints that would return
// 404/500 errors and creates a clean, working API surface focused on essential
// cart functionality needed for the ML demonstration.
//
// The remaining endpoints are all fully implemented and support:
// - Demand 1: User cart management for seeded users
// - Demand 4: Good shopping user experience
// ============================================================================