// backend/src/routes/product.routes.ts
// SANITIZED: Removed file uploads and admin CRUD - READ-ONLY catalog for dev/test

import { Router } from 'express';
import { query, param } from 'express-validator';
import { ProductController } from '../controllers/product.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const productController = new ProductController();

// ============================================================================
// PUBLIC READ-ONLY ROUTES (Core functionality for users)
// ============================================================================

// Get all products with filters
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().isIn(['name', 'price', 'createdAt', 'popularity', 'rating']),
    query('order').optional().isIn(['asc', 'desc']),
    query('search').optional().trim(),
    query('categories').optional(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('inStock').optional().isBoolean(),
    query('onSale').optional().isBoolean(),
    query('featured').optional().isBoolean()
  ],
  validateRequest,
  productController.getProducts
);

// Get single product
router.get(
  '/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  productController.getProduct
);

// Get product recommendations
router.get(
  '/:id/recommendations',
  [
    param('id').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 20 })
  ],
  validateRequest,
  productController.getRecommendations
);

// Get categories (read-only)
router.get(
  '/categories',
  productController.getCategories
);

// Get category by ID (read-only)
router.get(
  '/categories/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  productController.getCategory
);

// Get price range
router.get(
  '/price-range',
  productController.getPriceRange
);

// Track product view (authenticated optional)
router.post(
  '/:id/view',
  [
    param('id').isUUID()
  ],
  validateRequest,
  productController.trackView
);

// ============================================================================
// REMOVED: All admin CRUD operations (create, update, delete)
// REMOVED: All file upload functionality
// REMOVED: Bulk operations
// REMOVED: Import/export functionality
// 
// Products and categories are now populated ONLY via database seeding
// This creates a clean, read-only catalog for dev/test demonstrations
// ============================================================================

export default router;