// backend/src/controllers/user.controller.ts
// UPDATED: Simplified preferences handling to match new model

import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/user.model';
import { UserPreference } from '@/models/userPreference.model';
import { Favorite } from '@/models/favorite.model';
import { Product } from '@/models/product.model';
import logger from '@/utils/logger';

export class UserController {
  // ... (existing methods like getProfile, updateProfile, favorites remain the same) ...

  // ============================================================================
  // SIMPLIFIED PREFERENCES MANAGEMENT
  // ============================================================================

  // Get user prediction preferences
  async getUserPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      let preferences = await UserPreference.findOne({
        where: { userId }
      });

      // Create default preferences if none exist
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

      res.json({
        preferences: {
          autoBasketEnabled: preferences.autoBasketEnabled,
          autoBasketDay: preferences.autoBasketDay,
          autoBasketTime: preferences.autoBasketTime,
          emailNotifications: preferences.emailNotifications,
          darkMode: preferences.darkMode
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user prediction preferences
  async updateUserPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const {
        autoBasketEnabled,
        autoBasketDay,
        autoBasketTime,
        emailNotifications,
        darkMode
      } = req.body;

      // Find or create preferences
      let preferences = await UserPreference.findOne({
        where: { userId }
      });

      if (!preferences) {
        preferences = await UserPreference.create({
          userId,
          autoBasketEnabled: autoBasketEnabled ?? true,
          autoBasketDay: autoBasketDay ?? 0,
          autoBasketTime: autoBasketTime ?? '10:00:00',
          emailNotifications: emailNotifications ?? true,
          darkMode: darkMode ?? false
        });
      } else {
        await preferences.update({
          ...(autoBasketEnabled !== undefined && { autoBasketEnabled }),
          ...(autoBasketDay !== undefined && { autoBasketDay }),
          ...(autoBasketTime !== undefined && { autoBasketTime }),
          ...(emailNotifications !== undefined && { emailNotifications }),
          ...(darkMode !== undefined && { darkMode })
        });
      }

      logger.info(`User preferences updated: ${userId}`, {
        autoBasketEnabled: preferences.autoBasketEnabled,
        autoBasketDay: preferences.autoBasketDay,
        autoBasketTime: preferences.autoBasketTime
      });

      res.json({
        message: 'Preferences updated successfully',
        preferences: {
          autoBasketEnabled: preferences.autoBasketEnabled,
          autoBasketDay: preferences.autoBasketDay,
          autoBasketTime: preferences.autoBasketTime,
          emailNotifications: preferences.emailNotifications,
          darkMode: preferences.darkMode
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ... (all other existing methods remain unchanged) ...
}

// ============================================================================
// SIMPLIFICATION NOTES:
// 
// REMOVED COMPLEX PREFERENCE METHODS:
// - updateDietaryRestrictions()
// - updatePreferredBrands()
// - updateDeliveryPreferences()
// - updateLanguageAndCurrency()
// - updateBudgetLimits()
// - updateAllergies()
// - updateHouseholdInfo()
// 
// KEPT ESSENTIAL METHODS:
// - getUserPreferences() - Core ML prediction settings
// - updateUserPreferences() - Update prediction schedule
// - All favorite-related methods (essential for user experience)
// - Profile management methods (essential functionality)
// 
// This simplified approach focuses on the core preferences needed for:
// 1. ML prediction scheduling (when to generate auto baskets)
// 2. Basic notification preferences
// 3. Simple UI customization (dark mode)
// 
// Perfect for dev/test stage while maintaining all 4 core demands.
// ============================================================================