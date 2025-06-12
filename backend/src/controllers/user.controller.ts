// backend/src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { Favorite } from '../models/favorite.model';
import { Product } from '../models/product.model';
import { UserPreference } from '../models/userPreference.model';
import { Order } // For order history example
from '../models/order.model';
import logger from '../utils/logger';

export class UserController {
    // --- Profile ---
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
                include: [{ model: UserPreference, as: 'preferences' }]
            });
            if (!user) {
                logger.warn(`User profile not found for ID: ${userId}`);
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            logger.error(`Error fetching profile for user ID ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            // Only allow updating specific fields
            const { firstName, lastName, phone } = req.body;
            const profileUpdates: Partial<User> = {};
            if (firstName !== undefined) profileUpdates.firstName = firstName;
            if (lastName !== undefined) profileUpdates.lastName = lastName;
            if (phone !== undefined) profileUpdates.phone = phone; // Consider validation for phone format

            const user = await User.findByPk(userId);
            if (!user) {
                logger.warn(`User not found for profile update, ID: ${userId}`);
                return res.status(404).json({ error: 'User not found' });
            }

            await user.update(profileUpdates);

            // Handle preferences separately if they are part of the same request
            // Or have a dedicated endpoint for preferences (which is better, see below)
            if (req.body.preferences && typeof req.body.preferences === 'object') {
                await this.handlePreferenceUpdate(userId, req.body.preferences);
            }
            
            const updatedUser = await User.findByPk(userId, {
                attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
                include: [{ model: UserPreference, as: 'preferences' }]
            });
            logger.info(`Profile updated for user ID: ${userId}`);
            res.json(updatedUser);
        } catch (error) {
            logger.error(`Error updating profile for user ID ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    // --- Favorites ---
    async getFavorites(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const favorites = await Favorite.findAll({
                where: { userId },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'salePrice', 'imageUrl', 'sku', 'isActive', 'isOnSale', 'compareAtPrice'] // Select specific fields
                }],
                order: [['createdAt', 'DESC']],
            });
            // Filter out favorites where product might have become inactive
            const activeFavorites = favorites.filter(fav => fav.product && fav.product.isActive);
            res.json(activeFavorites);
        } catch (error) {
            logger.error(`Error fetching favorites for user ID ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    async addFavorite(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { productId } = req.body;

            const product = await Product.findByPk(productId);
            if (!product || !product.isActive) {
                return res.status(404).json({ error: 'Product not found or is inactive.' });
            }

            const [favorite, created] = await Favorite.findOrCreate({
                where: { userId, productId },
                defaults: { userId, productId },
            });
            
            const favoriteWithProductDetails = await Favorite.findByPk(favorite.id, {
                 include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'price', 'salePrice', 'imageUrl', 'sku'] }]
            });

            if (!created) {
                 logger.info(`Product ${productId} already in favorites for user ${userId}. Returning existing.`);
                 return res.status(200).json(favoriteWithProductDetails); // Return the favorite even if it existed
            }
            logger.info(`Product ${productId} added to favorites for user ${userId}`);
            res.status(201).json(favoriteWithProductDetails);
        } catch (error) {
            logger.error(`Error adding favorite for user ID ${(req as any).user.id}, product ID ${req.body.productId}:`, error);
            next(error);
        }
    }

    async removeFavorite(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { productId } = req.params;

            const result = await Favorite.destroy({
                where: { userId, productId },
            });

            if (result === 0) {
                return res.status(404).json({ error: 'Favorite not found for this user and product.' });
            }
            logger.info(`Product ${productId} removed from favorites for user ${userId}`);
            res.status(204).send();
        } catch (error) {
            logger.error(`Error removing favorite for user ID ${(req as any).user.id}, product ID ${req.params.productId}:`, error);
            next(error);
        }
    }
    
    async getFavoriteIds(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const favorites = await Favorite.findAll({
                where: { userId },
                attributes: ['productId'],
            });
            res.json({ productIds: favorites.map(fav => fav.productId) });
        } catch (error) {
            logger.error(`Error fetching favorite IDs for user ID ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    async isProductFavorited(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { productId } = req.params;
            const favorite = await Favorite.findOne({ where: { userId, productId } });
            res.json({ isFavorited: !!favorite });
        } catch (error) {
            logger.error(`Error checking if product ${req.params.productId} is favorited by user ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    // --- User Preferences ---
    private async handlePreferenceUpdate(userId: string, preferenceUpdates: Partial<UserPreference>) {
        // Sanitize preferenceUpdates here if necessary
        const allowedPreferenceFields = [
            'autoBasketEnabled', 'autoBasketDay', 'autoBasketTime', 
            'deliveryPreference', 'dietaryRestrictions', 'preferredBrands',
            'notificationsEnabled', 'emailNotifications', 'smsNotifications',
            'language', 'currency', 'metadata' // Allow full metadata object update
        ];
        
        const validUpdates: Partial<UserPreference> = {};
        for (const key of allowedPreferenceFields) {
            if (preferenceUpdates.hasOwnProperty(key)) {
                (validUpdates as any)[key] = (preferenceUpdates as any)[key];
            }
        }
        // Special handling for metadata if you want to merge instead of overwrite
        if (preferenceUpdates.metadata && typeof preferenceUpdates.metadata === 'object') {
            const currentPrefs = await UserPreference.findOne({ where: { userId } });
            const currentMetadata = currentPrefs?.metadata || {};
            validUpdates.metadata = { ...currentMetadata, ...preferenceUpdates.metadata };
        }


        if (Object.keys(validUpdates).length > 0) {
            const [preferences, created] = await UserPreference.findOrCreate({
                where: { userId },
                defaults: { userId, ...validUpdates } as any,
            });
            if (!created) {
                await preferences.update(validUpdates);
            }
            logger.info(`Preferences updated for user ID: ${userId}`);
            return preferences;
        }
        return UserPreference.findOne({ where: { userId }}); // Return current if no valid updates
    }
    
    async getUserPreferences(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            let preferences = await UserPreference.findOne({ where: { userId }});
            if (!preferences) {
                logger.info(`No preferences found for user ${userId}, creating defaults.`);
                preferences = await UserPreference.create({ 
                    userId,
                    // Add your default preference values here explicitly
                    autoBasketEnabled: true,
                    autoBasketDay: 0, // Sunday
                    autoBasketTime: '10:00:00', // Ensure TIME format 'HH:MM:SS'
                    deliveryPreference: 'standard',
                    dietaryRestrictions: [],
                    preferredBrands: [],
                    notificationsEnabled: true,
                    emailNotifications: true,
                    smsNotifications: false,
                    language: 'en',
                    currency: 'USD',
                    metadata: {} 
                });
            }
            res.json(preferences);
        } catch (error) {
            logger.error(`Error fetching preferences for user ID ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    async updateUserPreferences(req: Request, res: Response, next: NextFunction) {
         try {
            const userId = (req as any).user.id;
            const preferences = await this.handlePreferenceUpdate(userId, req.body);
            res.json(preferences);
        } catch (error) {
            logger.error(`Error updating preferences for user ID ${(req as any).user.id}:`, error);
            next(error);
        }
    }

    // Example for Order History (actual logic might be in OrderController)
    // async getOrderHistory(req: Request, res: Response, next: NextFunction) {
    //     try {
    //         const userId = (req as any).user.id;
    //         const orders = await Order.findAll({
    //             where: { userId },
    //             order: [['createdAt', 'DESC']],
    //             // include items, delivery, etc. as needed
    //         });
    //         res.json(orders);
    //     } catch (error) {
    //         next(error);
    //     }
    // }
}