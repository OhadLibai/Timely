// backend/src/controllers/prediction.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { startOfWeek, addDays } from 'date-fns';
import { PredictedBasket } from '../models/predictedBasket.model';
import { PredictedBasketItem } from '../models/predictedBasketItem.model';
import { Product } from '../models/product.model';
import { User } from '../models/user.model';
import { Category } from '../models/category.model';
import { UserPreference } from '../models/userPreference.model';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/orderItem.model';
import { Cart } from '../models/cart.model';
import { mlApiClient } from '../services/ml.service';
import * as mlService from '../services/ml.service';
import logger from '../utils/logger';

export class PredictionController {
  
  // Get current predicted basket
  async getCurrentPredictedBasket(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    logger.info(`Generating live prediction for user ID: ${userId}`);

    try {
        // Step 1: Fetch the user's entire order history from our database.
        const orders = await Order.findAll({
            where: { userId },
            include: [{ model: OrderItem, attributes: ['productId'] }],
            order: [['createdAt', 'ASC']],
            limit: 50, // Limit to the last 50 orders to keep payload reasonable
        });

        if (orders.length < 2) {
            logger.warn(`User ${userId} has insufficient order history (<2 orders).`);
            return res.status(400).json({ message: "Not enough order history to generate a prediction." });
        }

        // Step 2: Format the history into a list of lists of product IDs.
        const formattedHistory: number[][] = orders
            .map(order => (order.orderItems || []).map(item => item.productId))
            .filter(order => order.length > 0);

        // Step 3: Call our ML service endpoint via the service layer.
        logger.info(`Sending ${formattedHistory.length} orders to ML service for user ${userId}.`);
        const predictionResponse = await mlService.getPredictionFromDbHistory(userId, formattedHistory);
        const predictedSkus = predictionResponse.predicted_skus;

        if (!predictedSkus || predictedSkus.length === 0) {
            logger.info(`ML service returned an empty basket for user ${userId}.`);
            return res.json({ predictedBasket: [] });
        }

        // Step 4: Enrich the predicted SKUs with full product details from our database.
        const predictedProducts = await Product.findAll({
            where: {
                id: { [Op.in]: predictedSkus }
            }
        });

        // Step 5: Return the fully detailed basket.
        logger.info(`Successfully returned a predicted basket with ${predictedProducts.length} items for user ${userId}.`);
        res.json({ predictedBasket: predictedProducts });

    } catch (error) {
        logger.error(`Error in getCurrentPredictedBasket for user ${userId}:`, error);
        next(error);
    }
  }

  // Get predicted basket by ID
  async getPredictedBasket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const basket = await PredictedBasket.findOne({
        where: { id, userId },
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
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
          }
        ],
        order: [[{ model: PredictedBasketItem, as: 'items' }, 'confidenceScore', 'DESC']]
      });

      if (!basket) {
        return res.status(404).json({ error: 'Predicted basket not found' });
      }

      const basketData = this.formatBasketData(basket);
      res.json(basketData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all predicted baskets for user
   * Fetches a history of previously saved predictions for a user
   * from the predicted_baskets table
   */ 
  async getUserPredictedBaskets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 10, status } = req.query;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const { rows: baskets, count: total } = await PredictedBasket.findAndCountAll({
        where,
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'imageUrl', 'price']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit as string),
        offset,
        distinct: true
      });

      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.json({
        baskets: baskets.map(basket => this.formatBasketData(basket)),
        total,
        page: parseInt(page as string),
        totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Generate new prediction
  async generatePrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { weekOf, forceRegenerate } = req.body;

      const targetWeek = weekOf ? new Date(weekOf) : startOfWeek(new Date());

      // Check if basket already exists
      if (!forceRegenerate) {
        const existingBasket = await PredictedBasket.findOne({
          where: {
            userId,
            weekOf: targetWeek,
            status: { [Op.ne]: 'rejected' }
          }
        });

        if (existingBasket) {
          return res.status(400).json({ 
            error: 'Basket already exists for this week. Use forceRegenerate to override.' 
          });
        }
      }

      const basket = await this.generateNewBasket(userId, targetWeek);
      const basketData = this.formatBasketData(basket);

      res.json(basketData);
    } catch (error) {
      next(error);
    }
  }

  // Update predicted basket item
  async updateBasketItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId, itemId } = req.params;
      const { quantity, isAccepted } = req.body;

      const basket = await PredictedBasket.findOne({
        where: { id: basketId, userId }
      });

      if (!basket) {
        return res.status(404).json({ error: 'Basket not found' });
      }

      const item = await PredictedBasketItem.findOne({
        where: { id: itemId, basketId }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const updates: any = {};
      if (quantity !== undefined) updates.quantity = quantity;
      if (isAccepted !== undefined) updates.isAccepted = isAccepted;

      await item.update(updates);

      // Update basket status if modified
      if (basket.status === 'generated') {
        await basket.update({ status: 'modified' });
      }

      // Get updated basket
      const updatedBasket = await PredictedBasket.findByPk(basketId, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
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
          }
        ]
      });

      const basketData = this.formatBasketData(updatedBasket!);
      res.json(basketData);
    } catch (error) {
      next(error);
    }
  }

  // Remove item from predicted basket
  async removeBasketItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId, itemId } = req.params;

      const basket = await PredictedBasket.findOne({
        where: { id: basketId, userId }
      });

      if (!basket) {
        return res.status(404).json({ error: 'Basket not found' });
      }

      const item = await PredictedBasketItem.findOne({
        where: { id: itemId, basketId }
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      await item.destroy();

      // Update basket status
      if (basket.status === 'generated') {
        await basket.update({ status: 'modified' });
      }

      // Get updated basket
      const updatedBasket = await PredictedBasket.findByPk(basketId, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
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
          }
        ]
      });

      const basketData = this.formatBasketData(updatedBasket!);
      res.json(basketData);
    } catch (error) {
      next(error);
    }
  }

  // Add item to predicted basket
  async addBasketItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId } = req.params;
      const { productId, quantity } = req.body;

      const basket = await PredictedBasket.findOne({
        where: { id: basketId, userId }
      });

      if (!basket) {
        return res.status(404).json({ error: 'Basket not found' });
      }

      // Check if product exists
      const product = await Product.findByPk(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if item already exists
      const existingItem = await PredictedBasketItem.findOne({
        where: { basketId, productId }
      });

      if (existingItem) {
        await existingItem.update({ quantity: existingItem.quantity + quantity });
      } else {
        await PredictedBasketItem.create({
          basketId,
          productId,
          quantity,
          confidenceScore: 0.5, // Default confidence for manually added items
          isAccepted: true
        });
      }

      // Update basket status
      if (basket.status === 'generated') {
        await basket.update({ status: 'modified' });
      }

      // Get updated basket
      const updatedBasket = await PredictedBasket.findByPk(basketId, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
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
          }
        ]
      });

      const basketData = this.formatBasketData(updatedBasket!);
      res.json(basketData);
    } catch (error) {
      next(error);
    }
  }

  // Accept predicted basket
  async acceptBasket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId } = req.params;

      const basket = await PredictedBasket.findOne({
        where: { id: basketId, userId },
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
            where: { isAccepted: true },
            required: false
          }
        ]
      });

      if (!basket) {
        return res.status(404).json({ error: 'Basket not found' });
      }

      if (basket.status === 'accepted') {
        return res.status(400).json({ error: 'Basket already accepted' });
      }

      if (!basket.items || basket.items.length === 0) {
        return res.status(400).json({ error: 'No items to accept' });
      }

      // Update basket status
      await basket.update({ 
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Create cart and redirect to cart sync
      // This is handled by the cart sync endpoint

      logger.info(`Predicted basket ${basketId} accepted by user ${userId}`);

      res.json({ 
        orderId: null, // Order will be created from cart
        message: 'Basket accepted. Items added to cart.'
      });
    } catch (error) {
      next(error);
    }
  }

  // Reject predicted basket
  async rejectBasket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId } = req.params;
      const { reason } = req.body;

      const basket = await PredictedBasket.findOne({
        where: { id: basketId, userId }
      });

      if (!basket) {
        return res.status(404).json({ error: 'Basket not found' });
      }

      await basket.update({ status: 'rejected' });

      // Log feedback for ML improvement
      if (reason) {
        logger.info(`Basket ${basketId} rejected by user ${userId}. Reason: ${reason}`);
      }

      res.json({ message: 'Basket rejected successfully' });
    } catch (error) {
      next(error);
    }
  }

  /*
   * Submit feedback.
   * This is the endpoint for collecting user feedback on a prediction.
   * When a user accepts, modifies, or rejects a predicted basket, the frontend sends this feedback here
   * "Online" evaluation and could be used in the future to retrain and improve
   * the model with real-world data.
   */
  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId, accepted, modifiedItems, rating, comment } = req.body;

      // Send feedback to ML service
      await mlApiClient.post('/feedback/basket', {
        userId,
        basketId,
        accepted,
        modifiedItems,
        rating,
        comment,
        timestamp: new Date()
      });

      logger.info(`Feedback submitted for basket ${basketId} by user ${userId}`);

      res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /*
   * Get online metrics.
   * Counterpart to submitFeedback.
   * It reads all the user feedback from the database and calculates "online"
   * performance metrics, such as "auto-cart acceptance rate." 
   */
  async getOnlineMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      // Calculate metrics from database
      const totalPredictions = await PredictedBasket.count();
      const acceptedPredictions = await PredictedBasket.count({
        where: { status: 'accepted' }
      });

      const autoCartAcceptanceRate = totalPredictions > 0 
        ? acceptedPredictions / totalPredictions 
        : 0;

      // Calculate average edit distance
      const modifiedBaskets = await PredictedBasket.findAll({
        where: { status: 'modified' },
        include: [
          {
            model: PredictedBasketItem,
            as: 'items'
          }
        ]
      });

      let totalEditDistance = 0;
      for (const basket of modifiedBaskets) {
        const originalCount = basket.items.length;
        const acceptedCount = basket.items.filter(item => item.isAccepted).length;
        totalEditDistance += Math.abs(originalCount - acceptedCount);
      }

      const avgEditDistance = modifiedBaskets.length > 0 
        ? totalEditDistance / modifiedBaskets.length 
        : 0;

      // Calculate cart value uplift
      // This would require comparing predicted basket values to actual order values
      const cartValueUplift = 0.15; // Placeholder

      // User satisfaction (from ratings)
      // This would come from feedback data
      const userSatisfactionScore = 4.2; // Placeholder

      res.json({
        autoCartAcceptanceRate,
        avgEditDistance,
        cartValueUplift,
        userSatisfactionScore,
        totalPredictions,
        successfulPredictions: acceptedPredictions
      });
    } catch (error) {
      next(error);
    }
  }

  /* 
   * Get personalized recommendations
   * This is a different type of recommendation.
   * While the main feature predicts a full basket for a user, this function likely provides item-based recommendations
   * (e.g., "products similar to this one" or "users who bought X also bought Y")
   */
  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { limit = 10, category, excludeBasket } = req.query;

      // Get recommendations from ML service
      const response = await mlApiClient.post('/recommendations/user', {
        userId,
        limit: parseInt(limit as string),
        categoryId: category,
        excludeBasket: excludeBasket === 'true'
      });

      const productIds = response.data.recommendations.map((r: any) => r.productId);
      const scores = response.data.recommendations.reduce((acc: any, r: any) => {
        acc[r.productId] = r.score;
        return acc;
      }, {});

      // Get product details
      const products = await Product.findAll({
        where: { 
          id: productIds,
          isActive: true
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ]
      });

      // Format recommendations
      const recommendations = products.map(product => ({
        product,
        score: scores[product.id] || 0,
        reason: this.getRecommendationReason(scores[product.id])
      }));

      // Sort by score
      recommendations.sort((a, b) => b.score - a.score);

      res.json(recommendations);
    } catch (error) {
      next(error);
    }
  }

  // Get prediction explanation
  async getPredictionExplanation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId, productId } = req.params;

      // Get historical data
      const historicalData = await OrderItem.findAll({
        include: [
          {
            model: Order,
            as: 'order',
            where: { userId },
            attributes: ['createdAt']
          }
        ],
        where: { productId },
        order: [[{ model: Order, as: 'order' }, 'createdAt', 'DESC']],
        limit: 10
      });

      // Get explanation from ML service
      try {
        const response = await mlApiClient.get(`/explanations/${userId}/${productId}`);
        
        res.json({
          factors: response.data.factors || [],
          historicalData: historicalData.map(item => ({
            date: item.order.createdAt,
            purchased: true,
            quantity: item.quantity
          })),
          confidence: response.data.confidence || 0.5
        });
      } catch (mlError) {
        // Fallback explanation
        res.json({
          factors: [
            { name: 'Purchase Frequency', impact: 0.8, description: 'You buy this regularly' },
            { name: 'Time Since Last Purchase', impact: 0.6, description: 'It\'s been a while' },
            { name: 'Category Preference', impact: 0.4, description: 'Popular in your preferred categories' }
          ],
          historicalData: historicalData.map(item => ({
            date: item.order.createdAt,
            purchased: true,
            quantity: item.quantity
          })),
          confidence: 0.7
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Get user preferences
  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const preferences = await UserPreference.findOne({ where: { userId } });

      if (!preferences) {
        // Return defaults
        return res.json({
          autoBasketEnabled: true,
          autoBasketDay: 0,
          autoBasketTime: '10:00',
          minConfidenceThreshold: 0.5,
          excludeCategories: [],
          maxBasketSize: 30
        });
      }

      res.json({
        autoBasketEnabled: preferences.autoBasketEnabled,
        autoBasketDay: preferences.autoBasketDay,
        autoBasketTime: preferences.autoBasketTime,
        minConfidenceThreshold: 0.5, // From metadata
        excludeCategories: preferences.metadata?.excludeCategories || [],
        maxBasketSize: preferences.metadata?.maxBasketSize || 30
      });
    } catch (error) {
      next(error);
    }
  }

  // Update preferences
  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;

      let preferences = await UserPreference.findOne({ where: { userId } });
      
      if (!preferences) {
        preferences = await UserPreference.create({ userId });
      }

      // Update basic preferences
      const basicUpdates: any = {};
      if (updates.autoBasketEnabled !== undefined) basicUpdates.autoBasketEnabled = updates.autoBasketEnabled;
      if (updates.autoBasketDay !== undefined) basicUpdates.autoBasketDay = updates.autoBasketDay;
      if (updates.autoBasketTime !== undefined) basicUpdates.autoBasketTime = updates.autoBasketTime;

      // Update metadata preferences
      const metadata = preferences.metadata || {};
      if (updates.minConfidenceThreshold !== undefined) metadata.minConfidenceThreshold = updates.minConfidenceThreshold;
      if (updates.excludeCategories !== undefined) metadata.excludeCategories = updates.excludeCategories;
      if (updates.maxBasketSize !== undefined) metadata.maxBasketSize = updates.maxBasketSize;

      basicUpdates.metadata = metadata;

      await preferences.update(basicUpdates);

      res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Get schedule
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

  // Update schedule
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



  // This is the implementation for the "Real Perfect Demo"
  public async getPredictionForCurrentUser(req: Request, res: Response, next: NextFunction) {
      const userId = (req.user as User).id;

      try {
          // Step 1: Fetch the user's entire order history from our database.
          const orders = await Order.findAll({
              where: { userId },
              include: [{ model: OrderItem, attributes: ['productId'] }],
              order: [['createdAt', 'ASC']],
          });

          if (orders.length < 2) {
              return res.status(400).json({ message: "Not enough order history to generate a prediction." });
          }

          // Step 2: Format the history into a list of lists of product IDs.
          const formattedHistory = orders.map(order => 
              order.orderItems.map(item => item.productId)
          );

          // Step 3: Call our new, robust ML service endpoint.
          const predictionResponse = await mlService.getPredictionFromDbHistory(userId, formattedHistory);
          const predictedSkus = predictionResponse.predicted_skus;

          if (!predictedSkus || predictedSkus.length === 0) {
              return res.json({ predictedBasket: [] });
          }

          // Step 4: Enrich the predicted SKUs with full product details from our database.
          const predictedProducts = await Product.findAll({
              where: {
                  id: { [Op.in]: predictedSkus }
              }
          });

          // Step 5: Return the fully detailed basket.
          res.json({ predictedBasket: predictedProducts });

      } catch (error) {
          logger.error(`Error generating prediction for user ${userId}:`, error);
          next(error);
      }
  }

  // Get prediction history
  async getPredictionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const baskets = await PredictedBasket.findAll({
        where: {
          userId,
          createdAt: { [Op.gte]: startDate }
        },
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
            attributes: ['id', 'quantity', 'confidenceScore', 'isAccepted']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const history = baskets.map(basket => ({
        id: basket.id,
        weekOf: basket.weekOf,
        status: basket.status,
        itemCount: basket.items.length,
        acceptedItemCount: basket.items.filter(item => item.isAccepted).length,
        confidenceScore: basket.confidenceScore,
        createdAt: basket.createdAt,
        acceptedAt: basket.acceptedAt
      }));

      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  /* 
   * Evaluate prediction
   * This function evaluates one single, past prediction.
   * You would give it the ID of a basket that was previously predicted and saved.
   * It would then fetch that prediction and the user's actual order to calculate a performance score
   * for that specific instance.
   * This differs from our evaluate endpoint, which evaluates the model's performance across the entire test set in a batch.
   */
  async evaluatePrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId } = req.params;

      const basket = await PredictedBasket.findOne({
        where: { id: basketId, userId },
        include: [
          {
            model: PredictedBasketItem,
            as: 'items'
          }
        ]
      });

      if (!basket) {
        return res.status(404).json({ error: 'Basket not found' });
      }

      // Calculate metrics
      const totalItems = basket.items.length;
      const acceptedItems = basket.items.filter(item => item.isAccepted).length;
      const precision = totalItems > 0 ? acceptedItems / totalItems : 0;

      // Get actual order for the week if exists
      const weekEnd = addDays(new Date(basket.weekOf), 7);
      const actualOrder = await Order.findOne({
        where: {
          userId,
          createdAt: {
            [Op.gte]: basket.weekOf,
            [Op.lt]: weekEnd
          }
        },
        include: [
          {
            model: OrderItem,
            as: 'items'
          }
        ]
      });

      let recall = 0;
      let f1Score = 0;

      if (actualOrder) {
        const actualProductIds = actualOrder.items.map(item => item.productId);
        const predictedProductIds = basket.items.map(item => item.productId);
        
        const correctPredictions = predictedProductIds.filter(id => 
          actualProductIds.includes(id)
        ).length;

        recall = actualProductIds.length > 0 ? correctPredictions / actualProductIds.length : 0;
        f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      }

      res.json({
        precision,
        recall,
        f1Score,
        acceptanceRate: basket.status === 'accepted' ? 1 : 0,
        totalItems,
        acceptedItems,
        actualOrderFound: !!actualOrder
      });
    } catch (error) {
      next(error);
    }
  }


  // --------------
  // Helper methods
  // --------------

  /* 
   * Method for our main feature.
   * 1. Calls the ml-service with the user's ID to get the list of predicted product IDs.
   * 2. Takes that list of IDs and appeals to the database to fetch the full product details (name, image, price).
   * 3. Returns the "enriched" list of full product objects.
   */
  private async generateNewBasket(userId: string, weekOf: Date): Promise<PredictedBasket> {
    try {
      // Get predictions from ML service
      const response = await mlApiClient.post('/predict/next-basket', {
        user_id: userId,
        n_recommendations: 30
      });

      const predictions = response.data.predictions;

      // Create basket
      const basket = await PredictedBasket.create({
        userId,
        weekOf,
        status: 'generated',
        confidenceScore: response.data.confidence || 0.75
      });

      // Create basket items
      const items = await Promise.all(
        predictions.map(async (pred: any) => {
          const product = await Product.findByPk(pred.product_id);
          if (!product || !product.isActive) return null;

          return PredictedBasketItem.create({
            basketId: basket.id,
            productId: pred.product_id,
            quantity: pred.quantity || 1,
            confidenceScore: pred.confidence || 0.5,
            isAccepted: true
          });
        })
      );

      // Filter out null items
      const validItems = items.filter(item => item !== null);

      // Get full basket with items
      const fullBasket = await PredictedBasket.findByPk(basket.id, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
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
          }
        ]
      });

      logger.info(`Generated predicted basket ${basket.id} for user ${userId} with ${validItems.length} items`);

      return fullBasket!;
    } catch (mlError) {
      logger.error('ML service error, using fallback prediction', mlError);
      
      // Fallback: Get user's most frequently purchased items
      const frequentProducts = await OrderItem.findAll({
        attributes: [
          'productId',
          [OrderItem.sequelize!.fn('COUNT', OrderItem.sequelize!.col('productId')), 'count'],
          [OrderItem.sequelize!.fn('AVG', OrderItem.sequelize!.col('quantity')), 'avgQuantity']
        ],
        include: [
          {
            model: Order,
            as: 'order',
            where: { userId },
            attributes: []
          }
        ],
        group: ['productId'],
        order: [[OrderItem.sequelize!.fn('COUNT', OrderItem.sequelize!.col('productId')), 'DESC']],
        limit: 20,
        raw: true
      });

      // Create basket
      const basket = await PredictedBasket.create({
        userId,
        weekOf,
        status: 'generated',
        confidenceScore: 0.6
      });

      // Create items from frequent products
      await Promise.all(
        frequentProducts.map(async (item: any) => {
          const product = await Product.findByPk(item.productId);
          if (!product || !product.isActive) return;

          return PredictedBasketItem.create({
            basketId: basket.id,
            productId: item.productId,
            quantity: Math.ceil(item.avgQuantity),
            confidenceScore: Math.min(item.count / 10, 0.9),
            isAccepted: true
          });
        })
      );

      // Get full basket
      const fullBasket = await PredictedBasket.findByPk(basket.id, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
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
          }
        ]
      });

      return fullBasket!;
    }
  }

  private formatBasketData(basket: PredictedBasket) {
    const items = basket.items || [];
    const acceptedItems = items.filter(item => item.isAccepted);
    
    const totalItems = acceptedItems.length;
    const totalValue = acceptedItems.reduce((sum, item) => 
      sum + (item.product.salePrice * item.quantity), 0
    );

    return {
      id: basket.id,
      userId: basket.userId,
      weekOf: basket.weekOf,
      status: basket.status,
      confidenceScore: basket.confidenceScore,
      items: items.map(item => ({
        id: item.id,
        basketId: item.basketId,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        confidenceScore: item.confidenceScore,
        isAccepted: item.isAccepted,
        createdAt: item.createdAt
      })),
      totalItems,
      totalValue,
      acceptedAt: basket.acceptedAt,
      createdAt: basket.createdAt,
      updatedAt: basket.updatedAt
    };
  }

  private getRecommendationReason(score: number): string {
    if (score >= 0.8) return 'Highly recommended based on your purchase history';
    if (score >= 0.6) return 'Frequently purchased by you';
    if (score >= 0.4) return 'Popular in categories you like';
    return 'You might also like';
  }
}