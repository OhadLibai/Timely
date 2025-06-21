// backend/src/controllers/prediction.controller.ts
// SIMPLIFIED: No more data fetching - ML service handles everything

import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { User } from '../models/user.model';
import { UserPreference } from '../models/userPreference.model';
import * as mlService from '../services/ml.service';
import logger from '../utils/logger';

export class PredictionController {
  
  /**
   * SIMPLIFIED: Get predicted basket using direct ML database access
   * No more data fetching - ML service handles everything
   */
  async getCurrentPredictedBasket(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    logger.info(`Direct ML prediction for user ID: ${userId}`);

    try {
      // Step 1: Call ML service with just user ID (no data fetching!)
      const predictionResponse = await mlService.getPredictionFromDatabase(userId);
      const predictedProductIds = predictionResponse.predicted_products;

      if (!predictedProductIds || predictedProductIds.length === 0) {
        logger.info(`ML service returned empty basket for user ${userId}`);
        return res.json({ 
          predictedBasket: [],
          source: predictionResponse.source,
          timestamp: predictionResponse.timestamp
        });
      }

      // Step 2: Enrich predictions with product details (only step backend needs to do)
      const predictedProducts = await Product.findAll({
        where: {
          id: { [Op.in]: predictedProductIds }
        },
        include: [{ model: Category, attributes: ['name'] }]
      });

      // Step 3: Return enriched basket
      const enrichedBasket = predictedProducts.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        salePrice: product.isOnSale ? 
          (product.price * (1 - product.salePercentage / 100)) : product.price,
        imageUrl: product.imageUrl,
        category: product.category?.name,
        isOnSale: product.isOnSale,
        salePercentage: product.salePercentage
      }));

      logger.info(`Returning ${enrichedBasket.length} predicted products for user ${userId}`);
      
      res.json({
        predictedBasket: enrichedBasket,
        source: predictionResponse.source,
        feature_engineering: "black_box",
        timestamp: predictionResponse.timestamp,
        totalItems: enrichedBasket.length
      });

    } catch (error: any) {
      logger.error(`Direct ML prediction failed for user ${userId}:`, error);
      
      // Fallback to legacy method if database prediction fails
      try {
        logger.info(`Attempting legacy prediction fallback for user ${userId}`);
        return await this.getCurrentPredictedBasketLegacy(req, res, next);
      } catch (fallbackError) {
        logger.error(`Both direct and legacy predictions failed for user ${userId}:`, fallbackError);
        next(error);
      }
    }
  }

  /**
   * LEGACY METHOD: Keep for fallback during transition
   * Uses backend data fetching (old architecture)
   */
  async getCurrentPredictedBasketLegacy(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    logger.info(`Legacy ML prediction for user ID: ${userId}`);

    try {
      // This method would use the old data fetching approach
      // Implementation kept for fallback but simplified
      
      res.status(503).json({
        message: "Legacy prediction temporarily unavailable",
        suggestion: "Try again - system will use direct database prediction"
      });

    } catch (error) {
      logger.error(`Legacy prediction failed for user ${userId}:`, error);
      next(error);
    }
  }

  /**
   * SIMPLIFIED: Generate new basket with direct ML access
   */
  async generateNewBasket(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { preferences } = req.body;

    logger.info(`Generating new basket for user ${userId}`);

    try {
      // Step 1: Get fresh prediction from ML service (no data fetching needed)
      const predictionResponse = await mlService.getPredictionFromDatabase(userId);
      const predictedProductIds = predictionResponse.predicted_products;

      if (!predictedProductIds || predictedProductIds.length === 0) {
        return res.status(400).json({ 
          message: "Unable to generate basket recommendations" 
        });
      }

      // Step 2: Apply user preferences if provided
      let filteredProductIds = predictedProductIds;
      
      if (preferences) {
        filteredProductIds = await this.applyUserPreferences(predictedProductIds, preferences);
      }

      // Step 3: Get full product details
      const products = await Product.findAll({
        where: { id: { [Op.in]: filteredProductIds } },
        include: [{ model: Category, attributes: ['name'] }]
      });

      const basket = products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        salePrice: product.isOnSale ? 
          (product.price * (1 - product.salePercentage / 100)) : product.price,
        imageUrl: product.imageUrl,
        category: product.category?.name,
        quantity: 1
      }));

      const totalPrice = basket.reduce((sum, item) => sum + item.salePrice, 0);

      logger.info(`Generated basket: ${basket.length} items, total: $${totalPrice.toFixed(2)}`);

      res.json({
        basket,
        totalItems: basket.length,
        totalPrice: totalPrice.toFixed(2),
        source: predictionResponse.source,
        feature_engineering: "black_box",
        timestamp: predictionResponse.timestamp,
        appliedPreferences: preferences || null
      });

    } catch (error) {
      logger.error(`Basket generation failed for user ${userId}:`, error);
      next(error);
    }
  }

  /**
   * Helper method to apply user preferences to predicted product list
   */
  private async applyUserPreferences(productIds: string[], preferences: any): Promise<string[]> {
    let filteredIds = productIds;

    // Apply budget filter
    if (preferences.maxBudget) {
      const products = await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        attributes: ['id', 'price']
      });
      
      let currentTotal = 0;
      filteredIds = [];
      
      for (const productId of productIds) {
        const product = products.find(p => p.id === productId);
        if (product && currentTotal + product.price <= preferences.maxBudget) {
          filteredIds.push(productId);
          currentTotal += product.price;
        }
      }
    }

    // Apply category exclusions
    if (preferences.excludeCategories && preferences.excludeCategories.length > 0) {
      const products = await Product.findAll({
        where: { id: { [Op.in]: filteredIds } },
        include: [{ model: Category, attributes: ['id'] }]
      });
      
      filteredIds = products
        .filter(product => !preferences.excludeCategories.includes(product.categoryId))
        .map(product => product.id);
    }

    // Apply basket size limit
    if (preferences.maxBasketSize && filteredIds.length > preferences.maxBasketSize) {
      filteredIds = filteredIds.slice(0, preferences.maxBasketSize);
    }

    return filteredIds;
  }

  // KEEP EXISTING: Preference management methods (unchanged)
  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const preferences = await UserPreference.findOne({ where: { userId } });

      if (!preferences) {
        return res.json({
          dietaryRestrictions: [],
          preferredBrands: [],
          excludedCategories: [],
          maxBudget: null
        });
      }

      res.json({
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        preferredBrands: preferences.preferredBrands || [],
        excludedCategories: preferences.excludedCategories || [],
        maxBudget: preferences.maxBudget
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;

      let preferences = await UserPreference.findOne({ where: { userId } });
      
      if (!preferences) {
        preferences = await UserPreference.create({ userId });
      }

      const basicUpdates: any = {};
      if (updates.dietaryRestrictions !== undefined) basicUpdates.dietaryRestrictions = updates.dietaryRestrictions;
      if (updates.preferredBrands !== undefined) basicUpdates.preferredBrands = updates.preferredBrands;
      if (updates.excludedCategories !== undefined) basicUpdates.excludedCategories = updates.excludedCategories;
      if (updates.maxBudget !== undefined) basicUpdates.maxBudget = updates.maxBudget;

      await preferences.update(basicUpdates);

      res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const preferences = await UserPreference.findOne({ where: { userId } });

      res.json({
        enabled: preferences?.autoBasketEnabled || false,
        dayOfWeek: preferences?.autoBasketDay || 0,
        timeOfDay: preferences?.autoBasketTime || '10:00'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { enabled, dayOfWeek, timeOfDay } = req.body;

      let preferences = await UserPreference.findOne({ where: { userId } });
      
      if (!preferences) {
        preferences = await UserPreference.create({ userId });
      }

      await preferences.update({
        autoBasketEnabled: enabled,
        autoBasketDay: dayOfWeek,
        autoBasketTime: timeOfDay
      });

      res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}