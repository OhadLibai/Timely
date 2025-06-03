// backend/src/routes/user.routes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
// authMiddleware is typically applied in server.ts for the entire '/api/user' group

const router = Router();
const userController = new UserController();

// === Profile Routes ===
router.get(
    '/profile',
    userController.getProfile
);
router.put(
    '/profile',
    [
        body('firstName').optional().notEmpty().trim().isString().withMessage('First name must be a non-empty string'),
        body('lastName').optional().notEmpty().trim().isString().withMessage('Last name must be a non-empty string'),
        body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number format'),
        // Add validation for preferences sub-object if it's complex
        body('preferences').optional().isObject().withMessage('Preferences must be an object'),
        body('preferences.autoBasketEnabled').optional().isBoolean(),
        body('preferences.autoBasketDay').optional().isInt({ min: 0, max: 6 }),
        // Add more preference validations as needed
    ],
    validateRequest,
    userController.updateProfile
);

// === Favorites Routes ===
router.get(
    '/favorites',
    userController.getFavorites
);
router.post(
    '/favorites/add',
    [
        body('productId').isUUID().withMessage('Valid Product ID (UUID) is required'),
    ],
    validateRequest,
    userController.addFavorite
);
router.delete(
    '/favorites/:productId',
    [
        param('productId').isUUID().withMessage('Valid Product ID (UUID) is required in URL parameter'),
    ],
    validateRequest,
    userController.removeFavorite
);
router.get(
    '/favorites/ids',
    userController.getFavoriteIds
);
router.get(
    '/favorites/check/:productId',
    [
        param('productId').isUUID().withMessage('Valid Product ID (UUID) is required in URL parameter'),
    ],
    validateRequest,
    userController.isProductFavorited
);

// === User Preferences Routes (more detailed than just profile update) ===
router.get(
    '/preferences',
    userController.getUserPreferences
);
router.put(
    '/preferences',
    [ // Add specific validations for each preference field
        body('autoBasketEnabled').optional().isBoolean(),
        body('autoBasketDay').optional().isInt({min: 0, max: 6}),
        body('autoBasketTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:MM format
        body('deliveryPreference').optional().isString(),
        body('dietary_restrictions').optional().isArray(),
        body('preferred_brands').optional().isArray(),
        body('notifications_enabled').optional().isBoolean(),
        body('email_notifications').optional().isBoolean(),
        body('sms_notifications').optional().isBoolean(),
        body('metadata.minConfidenceThreshold').optional().isFloat({min:0, max:1}), // Example for nested metadata
        body('metadata.excludeCategories').optional().isArray(),
        body('metadata.maxBasketSize').optional().isInt({min:1, max: 100}),
    ],
    validateRequest,
    userController.updateUserPreferences
);

// Placeholder for Order History (actual order routes are likely separate)
// router.get('/orders', userController.getOrderHistory);

export default router;