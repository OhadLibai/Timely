// backend/src/routes/admin.routes.ts
// FIXED: Consistent route paths to match frontend expectations

import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes protected by auth and admin middleware
router.use(authMiddleware);
router.use(adminMiddleware);

// ============================================================================
// MODEL EVALUATION & MONITORING (NO FEATURE IMPORTANCE)
// ============================================================================

// FIXED: Model evaluation path to match frontend
router.post('/ml/evaluate', adminController.triggerModelEvaluation);

// ML service health and monitoring
router.get('/ml-service/status', adminController.getMLServiceStatus);
router.get('/architecture/status', adminController.getArchitectureStatus);

// ============================================================================
// DEMO PREDICTION SYSTEM
// ============================================================================

// Demo prediction functionality - paths match frontend
router.get('/demo/user-ids', adminController.getDemoUserIds);
router.get('/demo/user-prediction/:userId', adminController.getDemoUserPrediction);
router.post('/demo/seed-user/:instacartUserId', adminController.seedDemoUser);

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

// Dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

// System health
router.get('/system/health', adminController.getSystemHealth);

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

// Product CRUD operations
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:productId', adminController.updateProduct);
router.delete('/products/:productId', adminController.deleteProduct);

// ============================================================================
// USER MANAGEMENT  
// ============================================================================

// User management operations
router.get('/users', adminController.getUsers);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

// Order management operations
router.get('/orders', adminController.getOrders);
router.put('/orders/:orderId/status', adminController.updateOrderStatus);

// ============================================================================
// LEGACY COMPATIBILITY (if needed)
// ============================================================================

// Legacy evaluation endpoint (redirect to new path)
router.post('/evaluation', adminController.triggerModelEvaluation);

export default router;