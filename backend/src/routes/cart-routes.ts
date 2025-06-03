// backend/src/routes/cart.routes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { CartController } from '../controllers/cart.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const cartController = new CartController();

// Get current cart
router.get(
  '/',
  cartController.getCart
);

// Add item to cart
router.post(
  '/add',
  [
    body('productId').isUUID(),
    body('quantity').isInt({ min: 1 })
  ],
  validateRequest,
  cartController.addToCart
);

// Update cart item quantity
router.put(
  '/items/:itemId',
  [
    param('itemId').isUUID(),
    body('quantity').isInt({ min: 1 })
  ],
  validateRequest,
  cartController.updateCartItem
);

// Remove item from cart
router.delete(
  '/items/:itemId',
  [
    param('itemId').isUUID()
  ],
  validateRequest,
  cartController.removeFromCart
);

// Clear entire cart
router.post(
  '/clear',
  cartController.clearCart
);

// Apply coupon code
router.post(
  '/coupon',
  [
    body('code').notEmpty().trim()
  ],
  validateRequest,
  cartController.applyCoupon
);

// Remove coupon
router.delete(
  '/coupon',
  cartController.removeCoupon
);

// Sync with predicted basket
router.post(
  '/sync-predicted/:basketId',
  [
    param('basketId').isUUID()
  ],
  validateRequest,
  cartController.syncWithPredictedBasket
);

// Validate cart stock
router.post(
  '/validate',
  cartController.validateCart
);

// Merge guest cart (after login)
router.post(
  '/merge',
  [
    body('items').isArray(),
    body('items.*.productId').isUUID(),
    body('items.*.quantity').isInt({ min: 1 })
  ],
  validateRequest,
  cartController.mergeGuestCart
);

// Get cart count (lightweight endpoint)
router.get(
  '/count',
  cartController.getCartCount
);

// Save cart for later
router.post(
  '/save-for-later/:itemId',
  [
    param('itemId').isUUID()
  ],
  validateRequest,
  cartController.saveForLater
);

// Move from saved to cart
router.post(
  '/move-to-cart/:itemId',
  [
    param('itemId').isUUID()
  ],
  validateRequest,
  cartController.moveToCart
);

// Get saved items
router.get(
  '/saved',
  cartController.getSavedItems
);

// Estimate shipping
router.post(
  '/estimate-shipping',
  [
    body('zipCode').notEmpty().trim(),
    body('country').optional().trim()
  ],
  validateRequest,
  cartController.estimateShipping
);

// Get cart recommendations
router.get(
  '/recommendations',
  [
    query('limit').optional().isInt({ min: 1, max: 10 })
  ],
  validateRequest,
  cartController.getCartRecommendations
);

export default router;