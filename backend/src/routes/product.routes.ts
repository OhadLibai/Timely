// backend/src/routes/product.routes.ts
import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { ProductController } from '../controllers/product.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const productController = new ProductController();

// Public routes

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

// Get categories
router.get(
  '/categories',
  productController.getCategories
);

// Get category by ID
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

// Admin routes

// Create product
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  upload.array('images', 5),
  [
    body('sku').notEmpty().trim(),
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }),
    body('compareAtPrice').optional().isFloat({ min: 0 }),
    body('categoryId').isUUID(),
    body('stock').optional().isInt({ min: 0 }),
    body('trackInventory').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('tags').optional().isArray()
  ],
  validateRequest,
  productController.createProduct
);

// Update product
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  upload.array('images', 5),
  [
    param('id').isUUID(),
    body('sku').optional().trim(),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 0 }),
    body('compareAtPrice').optional().isFloat({ min: 0 }),
    body('categoryId').optional().isUUID(),
    body('stock').optional().isInt({ min: 0 }),
    body('trackInventory').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('isOnSale').optional().isBoolean(),
    body('salePercentage').optional().isFloat({ min: 0, max: 100 }),
    body('tags').optional().isArray()
  ],
  validateRequest,
  productController.updateProduct
);

// Delete product
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isUUID()
  ],
  validateRequest,
  productController.deleteProduct
);

// Bulk update products
router.post(
  '/bulk-update',
  authMiddleware,
  adminMiddleware,
  [
    body('updates').isArray().notEmpty(),
    body('updates.*.id').isUUID(),
    body('updates.*.updates').isObject()
  ],
  validateRequest,
  productController.bulkUpdate
);

// Import products
router.post(
  '/import',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  productController.importProducts
);

// Export products
router.get(
  '/export',
  authMiddleware,
  adminMiddleware,
  productController.exportProducts
);

// Category management

// Create category
router.post(
  '/categories',
  authMiddleware,
  adminMiddleware,
  upload.single('image'),
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('parentId').optional().isUUID()
  ],
  validateRequest,
  productController.createCategory
);

// Update category
router.put(
  '/categories/:id',
  authMiddleware,
  adminMiddleware,
  upload.single('image'),
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('parentId').optional().isUUID(),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  productController.updateCategory
);

// Delete category
router.delete(
  '/categories/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isUUID()
  ],
  validateRequest,
  productController.deleteCategory
);

export default router;