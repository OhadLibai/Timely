// backend/src/controllers/user.controller.ts
// FIXED: Removed dateOfBirth from updateProfile method

import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/user.model';
import { UserPreference } from '@/models/userPreference.model';
import { Cart } from '@/models/cart.model';
import { Favorite } from '@/models/favorite.model';
import { Product } from '@/models/product.model';
import { Category } from '@/models/category.model';
import logger from '@/utils/logger';

export class UserController {
  
  // ============================================================================
  // PROFILE MANAGEMENT (Essential for user experience)
  // ============================================================================

  // Get user profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      
      const user = await User.findByPk(userId, {
        include: [
          { 
            model: UserPreference, 
            as: 'preferences',
            required: false // Left join - user may not have preferences yet
          },
          { 
            model: Cart, 
            as: 'cart',
            required: false
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data without sensitive fields (toJSON() handles this)
      res.json({
        user: user.toJSON(),
        preferences: user.preferences || null
      });

    } catch (error) {
      logger.error(`Error fetching profile for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // FIXED: Update user profile - removed dateOfBirth field
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { firstName, lastName, phone } = req.body; // REMOVED dateOfBirth

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update allowed profile fields - REMOVED dateOfBirth
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;

      await user.update(updateData);

      logger.info(`Profile updated for user: ${user.email}`);

      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON()
      });

    } catch (error) {
      logger.error(`Error updating profile for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // ============================================================================
  // USER PREFERENCES (Supporting ML functionality)
  // ============================================================================

  // Get user preferences
  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      let preferences = await UserPreference.findOne({
        where: { userId }
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await UserPreference.create({
          userId,
          autoBasketEnabled: false,
          autoBasketDay: 0, // Sunday
          autoBasketTime: '09:00',
          dietaryRestrictions: [],
          favoriteCategories: [],
          budgetRange: [50, 200],
          householdSize: 1,
          shoppingFrequency: 'weekly'
        });
      }

      res.json(preferences);

    } catch (error) {
      logger.error(`Error fetching preferences for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // Update user preferences
  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const {
        autoBasketEnabled,
        autoBasketDay,
        autoBasketTime,
        dietaryRestrictions,
        favoriteCategories,
        budgetRange,
        householdSize,
        shoppingFrequency
      } = req.body;

      let preferences = await UserPreference.findOne({
        where: { userId }
      });

      const updateData: any = {};
      if (autoBasketEnabled !== undefined) updateData.autoBasketEnabled = autoBasketEnabled;
      if (autoBasketDay !== undefined) updateData.autoBasketDay = autoBasketDay;
      if (autoBasketTime !== undefined) updateData.autoBasketTime = autoBasketTime;
      if (dietaryRestrictions !== undefined) updateData.dietaryRestrictions = dietaryRestrictions;
      if (favoriteCategories !== undefined) updateData.favoriteCategories = favoriteCategories;
      if (budgetRange !== undefined) updateData.budgetRange = budgetRange;
      if (householdSize !== undefined) updateData.householdSize = householdSize;
      if (shoppingFrequency !== undefined) updateData.shoppingFrequency = shoppingFrequency;

      if (preferences) {
        await preferences.update(updateData);
      } else {
        preferences = await UserPreference.create({
          userId,
          ...updateData
        });
      }

      logger.info(`Preferences updated for user: ${userId}`);

      res.json({
        message: 'Preferences updated successfully',
        preferences
      });

    } catch (error) {
      logger.error(`Error updating preferences for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // ============================================================================
  // USER FAVORITES (Essential for user experience)
  // ============================================================================

  // Get user favorites
  async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const favorites = await Favorite.findAll({
        where: { userId },
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category'
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json(favorites);

    } catch (error) {
      logger.error(`Error fetching favorites for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // Add product to favorites
  async addFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.body;

      // Check if product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if already favorited
      const existingFavorite = await Favorite.findOne({
        where: { userId, productId }
      });

      if (existingFavorite) {
        return res.status(400).json({ error: 'Product already in favorites' });
      }

      // Create favorite
      const favorite = await Favorite.create({
        userId,
        productId
      });

      // Fetch favorite with product details
      const favoriteWithProduct = await Favorite.findByPk(favorite.id, {
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category'
              }
            ]
          }
        ]
      });

      logger.info(`Product ${productId} added to favorites for user ${userId}`);

      res.status(201).json(favoriteWithProduct);

    } catch (error) {
      logger.error(`Error adding favorite for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // Remove product from favorites
  async removeFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const favorite = await Favorite.findOne({
        where: { userId, productId }
      });

      if (!favorite) {
        return res.status(404).json({ error: 'Favorite not found' });
      }

      await favorite.destroy();

      logger.info(`Product ${productId} removed from favorites for user ${userId}`);

      res.json({ message: 'Product removed from favorites' });

    } catch (error) {
      logger.error(`Error removing favorite for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // Get favorite product IDs only (for quick lookups)
  async getFavoriteIds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const favorites = await Favorite.findAll({
        where: { userId },
        attributes: ['productId']
      });

      const productIds = favorites.map(fav => fav.productId);

      res.json(productIds);

    } catch (error) {
      logger.error(`Error fetching favorite IDs for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // Check if product is favorited
  async isProductFavorited(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const favorite = await Favorite.findOne({
        where: { userId, productId }
      });

      res.json({ isFavorited: !!favorite });

    } catch (error) {
      logger.error(`Error checking favorite status for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================

  // Change password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Update password (will be hashed by the model hook)
      await user.update({ password: newPassword });

      logger.info(`Password changed for user: ${user.email}`);

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      logger.error(`Error changing password for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // Get user preferences (alias for compatibility)
  async getUserPreferences(req: Request, res: Response, next: NextFunction) {
    return this.getPreferences(req, res, next);
  }
}