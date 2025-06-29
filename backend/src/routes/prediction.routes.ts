// backend/src/routes/prediction.routes.ts - FIXED with auto-generate endpoints
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { PredictionController } from '@/controllers/prediction.controller';
import { validateRequest } from '@/middleware/validation.middleware';

const router = Router();
const predictionController = new PredictionController();

// ============================================================================
// CRITICAL NEW ENDPOINTS FOR USER BASKET GENERATION
// ============================================================================

// Auto-generate next basket (Main endpoint for users)
router.post(
  '/auto-generate',
  predictionController.autoGenerateBasket
);

// Get next basket recommendation (Alternative endpoint)
router.post(
  '/next-basket', 
  predictionController.getNextBasketRecommendation
);

// ============================================================================
// EXISTING ENDPOINTS
// ============================================================================

// Get current predicted basket
router.get(
  '/current-basket',
  predictionController.getCurrentPredictedBasket
);

// Get predicted basket by ID
router.get(
  '/baskets/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  predictionController.getPredictedBasket
);

// Get all predicted baskets for user
router.get(
  '/baskets',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['generated', 'modified', 'accepted', 'rejected'])
  ],
  validateRequest,
  predictionController.getUserPredictedBaskets
);

// Generate new prediction (generic endpoint)
router.post(
  '/generate',
  [
    body('weekOf').optional().isISO8601(),
    body('forceRegenerate').optional().isBoolean()
  ],
  validateRequest,
  predictionController.generatePrediction
);

// Update predicted basket item
router.put(
  '/baskets/:basketId/items/:itemId',
  [
    param('basketId').isUUID(),
    param('itemId').isUUID(),
    body('quantity').optional().isInt({ min: 1 }),
    body('isAccepted').optional().isBoolean()
  ],
  validateRequest,
  predictionController.updateBasketItem
);

// Remove item from predicted basket
router.delete(
  '/baskets/:basketId/items/:itemId',
  [
    param('basketId').isUUID(),
    param('itemId').isUUID()
  ],
  validateRequest,
  predictionController.removeBasketItem
);

// Add item to predicted basket
router.post(
  '/baskets/:basketId/items',
  [
    param('basketId').isUUID(),
    body('productId').isUUID(),
    body('quantity').isInt({ min: 1 })
  ],
  validateRequest,
  predictionController.addBasketItem
);

// Accept predicted basket (convert to cart)
router.post(
  '/baskets/:basketId/accept',
  [
    param('basketId').isUUID()
  ],
  validateRequest,
  predictionController.acceptBasket
);

// Reject predicted basket
router.post(
  '/baskets/:basketId/reject',
  [
    param('basketId').isUUID(),
    body('reason').optional().trim()
  ],
  validateRequest,
  predictionController.rejectBasket
);

// Submit feedback
router.post(
  '/feedback',
  [
    body('basketId').isUUID(),
    body('accepted').isBoolean(),
    body('modifiedItems').optional().isArray(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().trim()
  ],
  validateRequest,
  predictionController.submitFeedback
);

// Get model performance metrics (for frontend display)
router.get(
  '/metrics/model-performance',
  predictionController.getModelMetrics
);

// Get online metrics
router.get(
  '/metrics/online',
  predictionController.getOnlineMetrics
);

// Get personalized recommendations
router.get(
  '/recommendations',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isUUID(),
    query('excludeBasket').optional().isBoolean()
  ],
  validateRequest,
  predictionController.getRecommendations
);

// Get prediction explanation
router.get(
  '/baskets/:basketId/explanation',
  [
    param('basketId').isUUID()
  ],
  validateRequest,
  predictionController.getPredictionExplanation
);

// Get user's prediction preferences
router.get(
  '/preferences',
  predictionController.getPreferences
);

// Update prediction preferences
router.put(
  '/preferences',
  [
    body('autoBasketEnabled').optional().isBoolean(),
    body('autoBasketDay').optional().isInt({ min: 0, max: 6 }),
    body('autoBasketTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('excludeCategories').optional().isArray(),
    body('maxBasketSize').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  predictionController.updatePreferences
);

// Get prediction statistics
router.get(
  '/stats',
  [
    query('period').optional().isIn(['week', 'month', 'year'])
  ],
  validateRequest,
  predictionController.getPredictionStats
);

export default router;