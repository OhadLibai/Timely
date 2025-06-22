// backend/src/routes/order.routes.ts
// COMPLETED: Added reorder endpoint and other missing routes

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { OrderController } from '@/controllers/order.controller';
import { validateRequest } from '@/middleware/validation.middleware';

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
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
    body('paymentMethod.type').isIn(['card', 'paypal', 'applepay', 'googlepay']).withMessage('Invalid payment method type'),
    body('deliveryType').optional().isIn(['standard', 'express', 'scheduled']).withMessage('Invalid delivery type'),
    body('scheduledDate').optional().isISO8601().withMessage('Scheduled date must be in ISO 8601 format'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
  ],
  validateRequest,
  orderController.createOrder
);

// ============================================================================
// ORDER ACTIONS
// ============================================================================

// FIXED: Reorder items from a previous order
router.post(
  '/:orderId/reorder',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('items').optional().isArray().withMessage('Items must be an array'),
    body('items.*.productId').optional().isUUID().withMessage('Product ID must be a valid UUID'),
    body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
  ],
  validateRequest,
  orderController.reorderItems
);

// Cancel an order
router.post(
  '/:orderId/cancel',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Cancellation reason must be less than 500 characters')
  ],
  validateRequest,
  orderController.cancelOrder
);

// Add order to favorites
router.post(
  '/:orderId/favorites',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Favorite name must be between 1 and 100 characters')
  ],
  validateRequest,
  orderController.addOrderToFavorites
);

// ============================================================================
// ORDER TRACKING & INFORMATION
// ============================================================================

// Track order by tracking number
router.get(
  '/track/:trackingNumber',
  [
    param('trackingNumber').notEmpty().trim().withMessage('Tracking number is required')
  ],
  validateRequest,
  orderController.trackOrder
);

// Get order statistics for user
router.get(
  '/stats',
  orderController.getOrderStats
);

// Download order receipt/invoice
router.get(
  '/:orderId/receipt',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID')
  ],
  validateRequest,
  orderController.downloadOrderReceipt
);

// ============================================================================
// ORDER STATUS UPDATES (Internal use - typically webhook endpoints)
// ============================================================================

// Update order status (internal/webhook use)
router.patch(
  '/:orderId/status',
  [
    param('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
    body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    body('trackingNumber').optional().trim().withMessage('Tracking number must be a string'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
  ],
  validateRequest,
  orderController.updateOrderStatus
);

export default router;