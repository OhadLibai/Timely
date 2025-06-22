// backend/src/routes/admin.routes.ts
// SIMPLIFIED: Admin routes for ML demo functionality only - NO CRUD operations

import { Router } from 'express';
import { AdminController } from '@/controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes protected by auth and admin middleware
router.use(authMiddleware);
router.use(adminMiddleware);

// ============================================================================
// CORE ML DEMO FUNCTIONALITY
// ============================================================================

// DEMAND 2: Model evaluation and performance metrics
router.post('/ml/evaluate', adminController.triggerModelEvaluation);
router.get('/ml/metrics/model-performance', adminController.getModelPerformanceMetrics);

// ML service health and monitoring
router.get('/ml-service/status', adminController.getMLServiceStatus);
router.get('/architecture/status', adminController.getArchitectureStatus);

// ============================================================================
// DEMO PREDICTION SYSTEM (Three core demands)
// ============================================================================

// DEMAND 1: User seeding functionality
router.post('/demo/seed-user/:instacartUserId', adminController.seedDemoUser);

// DEMAND 3: Individual user prediction comparison
router.get('/demo/user-prediction/:userId', adminController.getDemoUserPrediction);

// Demo system metadata
router.get('/demo/user-ids', adminController.getDemoUserIds);

// ============================================================================
// DASHBOARD & ANALYTICS (Read-only monitoring)
// ============================================================================

// System health and statistics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/system/health', adminController.getSystemHealth);

// ============================================================================
// READ-ONLY DATA VIEWS (No modification capabilities)
// ============================================================================

// View products (seeded via database only)
router.get('/products', adminController.getProducts);

// View users (includes demo users)
router.get('/users', adminController.getUsers);

// View orders (includes seeded demo orders)
router.get('/orders', adminController.getOrders);

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Legacy evaluation endpoint (redirect to new path)
router.post('/evaluation', adminController.triggerModelEvaluation);

// ============================================================================
// REMOVED ROUTES (Admin CRUD operations):
// 
// Product Management:
// - POST /products (create product)
// - PUT /products/:productId (update product)  
// - DELETE /products/:productId (delete product)
//
// Category Management:
// - POST /categories (create category)
// - PUT /categories/:categoryId (update category)
// - DELETE /categories/:categoryId (delete category)
//
// User Management:
// - PUT /users/:userId (update user)
// - DELETE /users/:userId (delete user)
//
// Order Management:
// - PUT /orders/:orderId/status (update order status)
//
// All data management is now handled via:
// 1. Database seeding scripts for products/categories
// 2. Demo user seeding for testing
// 3. Natural user registration for real users
//
// This creates a clean, demo-focused admin interface that eliminates
// complexity while maintaining all core ML demonstration capabilities.
// ============================================================================

export default router;