// backend/src/routes/order.routes.ts
// FIXED: Complete implementation replacing placeholder routes

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { OrderController } from '../controllers/order.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const orderController = new OrderController();

// ============================================================================
// USER ORDER MANAGEMENT
// ============================================================================

// Get user's order history with pagination and filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('sort').optional().isIn(['createdAt', 'total', 'status']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
  ],
  validateRequest,
  orderController.getUserOrders
);

// Get specific order details by ID
router.get(
  '/:orderId',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID')
  ],
  validateRequest,
  orderController.getOrderById
);

// ============================================================================
// ORDER CREATION & CHECKOUT
// ============================================================================

// Create a new order from cart
router.post(
  '/create',
  [
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
    body('deliveryAddress.street').notEmpty().trim().withMessage('Street address is required'),
    body('deliveryAddress.city').notEmpty().trim().withMessage('City is required'),
    body('deliveryAddress.state').notEmpty().trim().withMessage('State is required'),
    body('deliveryAddress.zipCode').notEmpty().trim().withMessage('ZIP code is required'),
    body('deliveryAddress.country').notEmpty().trim().withMessage('Country is required'),
    body('paymentMethod').notEmpty().trim().withMessage('Payment method is required'),
    body('deliveryTime').optional().isISO8601().withMessage('Delivery time must be in ISO 8601 format'),
    body('notes').optional().isString().trim(),
    body('saveAddress').optional().isBoolean(),
    body('savePayment').optional().isBoolean()
  ],
  validateRequest,
  orderController.createOrder
);

// ============================================================================
// ORDER STATUS & UPDATES
// ============================================================================

// Cancel an order (only allowed for certain statuses)
router.post(
  '/:orderId/cancel',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('reason').optional().isString().trim().withMessage('Cancellation reason must be a string')
  ],
  validateRequest,
  orderController.cancelOrder
);

// Request refund for an order
router.post(
  '/:orderId/refund',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('reason').notEmpty().trim().withMessage('Refund reason is required'),
    body('items').optional().isArray().withMessage('Items must be an array'),
    body('items.*.productId').optional().isUUID().withMessage('Product ID must be a valid UUID'),
    body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
  ],
  validateRequest,
  orderController.requestRefund
);

// ============================================================================
// ORDER TRACKING & DELIVERY
// ============================================================================

// Get order tracking information
router.get(
  '/:orderId/tracking',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID')
  ],
  validateRequest,
  orderController.getOrderTracking
);

// Update delivery preferences for pending orders
router.put(
  '/:orderId/delivery',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('deliveryTime').optional().isISO8601().withMessage('Delivery time must be in ISO 8601 format'),
    body('deliveryInstructions').optional().isString().trim(),
    body('contactMethod').optional().isIn(['phone', 'email', 'sms']).withMessage('Invalid contact method')
  ],
  validateRequest,
  orderController.updateDeliveryPreferences
);

// ============================================================================
// ORDER REVIEWS & FEEDBACK
// ============================================================================

// Add review for a delivered order
router.post(
  '/:orderId/review',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().trim(),
    body('productReviews').optional().isArray(),
    body('productReviews.*.productId').optional().isUUID().withMessage('Product ID must be a valid UUID'),
    body('productReviews.*.rating').optional().isInt({ min: 1, max: 5 }).withMessage('Product rating must be between 1 and 5'),
    body('productReviews.*.comment').optional().isString().trim()
  ],
  validateRequest,
  orderController.addOrderReview
);

// ============================================================================
// ORDER REORDERING & FAVORITES
// ============================================================================

// Reorder items from a previous order
router.post(
  '/:orderId/reorder',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('items').optional().isArray().withMessage('Items must be an array'),
    body('items.*.productId').optional().isUUID().withMessage('Product ID must be a valid UUID'),
    body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('addToCart').optional().isBoolean().withMessage('Add to cart must be a boolean')
  ],
  validateRequest,
  orderController.reorderItems
);

// Add entire order to favorites
router.post(
  '/:orderId/favorite',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('name').optional().isString().trim().withMessage('Favorite name must be a string')
  ],
  validateRequest,
  orderController.addOrderToFavorites
);

// ============================================================================
// ORDER HISTORY ANALYTICS
// ============================================================================

// Get order statistics for the user
router.get(
  '/analytics/stats',
  orderController.getOrderStats
);

// Get frequently ordered items
router.get(
  '/analytics/frequent-items',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  orderController.getFrequentItems
);

// Get order patterns (for auto-basket recommendations)
router.get(
  '/analytics/patterns',
  orderController.getOrderPatterns
);

// ============================================================================
// INVOICE & RECEIPTS
// ============================================================================

// Get order invoice/receipt
router.get(
  '/:orderId/invoice',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    query('format').optional().isIn(['json', 'pdf']).withMessage('Format must be json or pdf')
  ],
  validateRequest,
  orderController.getOrderInvoice
);

// Download order receipt
router.get(
  '/:orderId/receipt',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID')
  ],
  validateRequest,
  orderController.downloadReceipt
);

export default router;