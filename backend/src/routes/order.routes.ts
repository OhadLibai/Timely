// backend/src/routes/order.routes.ts
// CLEANED: Removed unimplemented features, kept only core functionality for 4 demands

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { OrderController } from '@/controllers/order.controller';
import { validateRequest } from '@/middleware/validation.middleware';

const router = Router();
const orderController = new OrderController();

// ============================================================================
// CORE ORDER MANAGEMENT (Essential for Demand 1 - User Experience)
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
// ORDER CREATION (Essential for Demand 1 - Complete Shopping Flow)
// ============================================================================

// Create a new order from cart
router.post(
  '/create',
  [
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
    body('deliveryAddress.street').notEmpty().trim().withMessage('Street address is required'),
    body('deliveryAddress.city').notEmpty().trim().withMessage('City is required'),
    body('deliveryAddress.state').notEmpty().trim().withMessage('State is required'),
    body('deliveryAddress.zipCode').notEmpty().trim().withMessage('Zip code is required'),
    body('deliveryAddress.country').optional().trim().withMessage('Country must be a string'),
    body('paymentMethod').notEmpty().trim().withMessage('Payment method is required'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
  ],
  validateRequest,
  orderController.createOrder
);

export default router;

// ============================================================================
// REMOVED UNIMPLEMENTED FEATURES:
// 
// The following routes were removed because their controller methods are not
// implemented and they are not required for the 4 core demands:
//
// - POST /:orderId/reorder (Reorder items from previous order)
// - POST /:orderId/cancel (Cancel an order) 
// - POST /:orderId/favorites (Add order to favorites)
// - GET /track/:trackingNumber (Track order by tracking number)
// - GET /stats (Get order statistics for user)
// - GET /:orderId/receipt (Download order receipt/invoice)
// - PATCH /:orderId/status (Update order status - internal/webhook use)
//
// REASON FOR REMOVAL:
// These features represent advanced e-commerce functionality that is not
// needed for the dev/test stage focused on demonstrating:
// 1. User seeding and order history display
// 2. ML model evaluation  
// 3. Individual user prediction performance
// 4. Basic shopping experience
//
// The remaining 3 endpoints provide complete functionality for:
// - Viewing order history (for seeded users to see their populated history)
// - Viewing individual order details
// - Creating new orders (completing the shopping flow)
//
// This creates a clean, working API that supports all core requirements
// without dead-end endpoints that would return errors.
// ============================================================================