// backend/src/controllers/user.controller.ts
// ADDED: Missing getProfile and updateProfile methods for user routes

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

  // Update user profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { firstName, lastName, phone, dateOfBirth } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update allowed profile fields
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

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
          autoBasketEnabled: true,
          autoBasketDay: 0, // Sunday
          autoBasketTime: '10:00:00',
          emailNotifications: true,
          darkMode: false
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
        emailNotifications, 
        darkMode 
      } = req.body;

      let preferences = await UserPreference.findOne({
        where: { userId }
      });

      const updateData: any = {};
      if (autoBasketEnabled !== undefined) updateData.autoBasketEnabled = autoBasketEnabled;
      if (autoBasketDay !== undefined) updateData.autoBasketDay = autoBasketDay;
      if (autoBasketTime !== undefined) updateData.autoBasketTime = autoBasketTime;
      if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
      if (darkMode !== undefined) updateData.darkMode = darkMode;

      if (preferences) {
        await preferences.update(updateData);
      } else {
        // Create new preferences with provided data
        preferences = await UserPreference.create({
          userId,
          ...updateData,
          // Ensure defaults for any missing fields
          autoBasketEnabled: updateData.autoBasketEnabled ?? true,
          autoBasketDay: updateData.autoBasketDay ?? 0,
          autoBasketTime: updateData.autoBasketTime ?? '10:00:00',
          emailNotifications: updateData.emailNotifications ?? true,
          darkMode: updateData.darkMode ?? false
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
  // FAVORITES MANAGEMENT (Supporting user experience)
  // ============================================================================

  // Get user's favorite products
  async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const favorites = await Favorite.findAndCountAll({
        where: { userId },
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        favorites: favorites.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: favorites.count,
          totalPages: Math.ceil(favorites.count / Number(limit))
        }
      });

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

      // Check if already favorited
      const existingFavorite = await Favorite.findOne({
        where: { userId, productId }
      });

      if (existingFavorite) {
        return res.status(400).json({ error: 'Product already in favorites' });
      }

      const favorite = await Favorite.create({ userId, productId });

      // Fetch complete favorite with product details
      const completeFavorite = await Favorite.findByPk(favorite.id, {
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      res.status(201).json({
        message: 'Product added to favorites',
        favorite: completeFavorite
      });

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

      res.json({ message: 'Product removed from favorites' });

    } catch (error) {
      logger.error(`Error removing favorite for user ${(req as any).user.id}:`, error);
      next(error);
    }
  }

  // Check if product is favorited
  async checkFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const favorite = await Favorite.findOne({
        where: { userId, productId }
      });

      res.json({ isFavorited: !!favorite });

    } catch (error) {
      logger.error(`Error checking favorite for user ${(req as any).user.id}:`, error);
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
}

// ============================================================================
// IMPLEMENTATION NOTES:
// 
// ADDED METHODS:
// - getProfile: Fetches user profile with preferences and cart
// - updateProfile: Updates basic profile fields (firstName, lastName, phone, dateOfBirth)
// - getPreferences: Fetches or creates default ML prediction preferences
// - updatePreferences: Updates ML prediction and UI preferences
// - getFavorites: Fetches user's favorite products with pagination
// - addFavorite: Adds product to user's favorites
// - removeFavorite: Removes product from user's favorites
// - checkFavorite: Checks if a product is favorited (for UI state)
// - getFavoriteIds: Gets array of favorite product IDs (for quick lookups)
//
// RATIONALE:
// These methods provide essential user profile and preference management needed
// for a complete shopping experience (Demand 4) and support the ML prediction
// functionality (Demands 1, 3). All methods are fully implemented with proper
// error handling, logging, and validation.
//
// The preferences methods specifically support the ML prediction features by
// allowing users to configure when and how auto-basket generation occurs.
// ============================================================================