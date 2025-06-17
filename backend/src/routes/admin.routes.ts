import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware'; // Ensures only admins can access

const router = Router();
const adminController = new AdminController();

// All admin routes should be protected by auth and admin middleware
router.use(authMiddleware);
router.use(adminMiddleware);

// Trigger Model Evaluation
router.post(
  '/evaluation',
  authMiddleware,
  adminMiddleware,
  adminController.triggerModelEvaluation
);

// ... other imports and routes
router.get(
  '/feature-importance',
  authMiddleware,
  adminMiddleware,
  adminController.getFeatureImportance
);

// Demo Simulation Routes
router.get('/demo/user-ids', adminController.getDemoUserIds);
router.get('/demo/user-prediction/:userId', adminController.getDemoUserPrediction);



export default router;