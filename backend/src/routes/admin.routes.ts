import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';

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

// In backend/src/routes/admin.routes.ts
router.post(
  '/demo/seed-user/:instacartUserId',
  authMiddleware,
  adminMiddleware,
  adminController.seedDemoUser
);

// Demo Simulation Routes
router.get('/demo/user-ids', adminController.getDemoUserIds);
router.get('/demo/user-prediction/:userId', adminController.getDemoUserPrediction);

export default router;