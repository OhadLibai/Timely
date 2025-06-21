// backend/src/routes/admin.routes.ts
// UPDATED: Removed feature importance routes, added ML monitoring routes

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

// Model evaluation (BLACK BOX - no feature importance exposure)
router.post('/evaluation', adminController.triggerModelEvaluation);

// NEW: ML service health and monitoring
router.get('/ml-service/status', adminController.getMLServiceStatus);
router.get('/architecture/status', adminController.getArchitectureStatus);

// ============================================================================
// DEMO PREDICTION SYSTEM
// ============================================================================

// Demo prediction functionality
router.get('/demo/user-ids', adminController.getDemoUserIds);
router.get('/demo/user-prediction/:userId', adminController.getDemoUserPrediction);
router.post('/demo/seed-user/:instacartUserId', adminController.seedDemoUser);

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

// Dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

// ============================================================================
// REMOVED ROUTES (Feature Engineering Black Box)
// ============================================================================

// REMOVED: Feature importance route (feature engineering is now black box)
// router.get('/feature-importance', adminController.getFeatureImportance);

export default router;