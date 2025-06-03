import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware'; // Ensures only admins can access

const router = Router();
const adminController = new AdminController();

// All admin routes should be protected by auth and admin middleware
router.use(authMiddleware);
router.use(adminMiddleware);

// ML Metrics & Evaluation
router.get('/ml-evaluation-metrics', adminController.getMLEvaluationMetrics);
// Add other admin-specific ML routes here, e.g., trigger retrain, get model status

// Demo Simulation Routes
router.get('/demo/user-ids', adminController.getDemoUserIds);
router.get('/demo/user-prediction/:userId', adminController.getDemoUserPrediction);

// Add other admin routes for dashboard stats, user management, etc.
// Example from your admin-service.ts:
// router.get('/dashboard', adminController.getDashboardStats);
// router.get('/users', adminController.getUsers);
// router.put('/users/:userId/status', adminController.updateUserStatus);
// ... etc.

export default router;