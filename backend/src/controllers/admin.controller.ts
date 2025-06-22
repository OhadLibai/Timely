// backend/src/controllers/admin.controller.ts 
// SIMPLIFIED: Removed product CRUD - focus on ML demo functionality only

import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import logger from '@/utils/logger';
import { User, Product, Order, Category, OrderItem } from '@/models';
import * as mlService from '@/services/ml.service';

export class AdminController {
  
  // ============================================================================
  // ML PROXY METHODS (Core demo functionality)
  // ============================================================================

  /**
   * Proxy model performance metrics request to ML service
   */
  async getModelPerformanceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Proxying model performance metrics request to ML service');
      
      const metrics = await mlService.getModelMetrics();
      
      res.json(metrics);
    } catch (error) {
      logger.error('Error fetching model performance metrics:', error);
      next(error);
    }
  }

  /**
   * DEMAND 2: Trigger model evaluation
   */
  async triggerModelEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Triggering model evaluation via ML service');
      
      const evaluationResults = await mlService.triggerModelEvaluation();
      
      res.json({
        message: 'Model evaluation completed',
        results: evaluationResults,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error triggering model evaluation:', error);
      next(error);
    }
  }

  // ============================================================================
  // DEMO FUNCTIONALITY (Core demands)
  // ============================================================================

  /**
   * DEMAND 1: Seed a demo user into the database using Instacart data
   */
  async seedDemoUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { instacartUserId } = req.params;
      
      logger.info(`Seeding demo user with Instacart ID: ${instacartUserId}`);
      
      // Step 1: Create new user account
      const newUser = await User.create({
        email: `demo_user_${instacartUserId}@timely.demo`,
        password: 'demo_password', // This should be hashed in real implementation
        name: `Demo User ${instacartUserId}`,
        isAdmin: false,
        isActive: true
      });
      
      // Step 2: Fetch order history from ML service
      const orderHistory = await mlService.getInstacartUserOrderHistory(instacartUserId);
      
      // Step 3: Populate database with order history
      for (const orderData of orderHistory.orders) {
        const order = await Order.create({
          userId: newUser.id,
          status: 'completed',
          totalAmount: orderData.total_amount || 0,
          orderDow: orderData.order_dow,
          orderHourOfDay: orderData.order_hour_of_day,
          daysSincePriorOrder: orderData.days_since_prior_order,
          createdAt: new Date(orderData.order_date || Date.now())
        });
        
        // Create order items
        for (const productId of orderData.products) {
          await OrderItem.create({
            orderId: order.id,
            productId: productId,
            quantity: 1,
            price: 0
          });
        }
      }
      
      logger.info(`Successfully seeded user ${newUser.id} with ${orderHistory.orders.length} orders`);
      
      res.json({
        message: 'Demo user seeded successfully',
        userId: newUser.id,
        instacartUserId,
        ordersCount: orderHistory.orders.length,
        loginEmail: newUser.email
      });
      
    } catch (error) {
      logger.error(`Error seeding demo user ${req.params.instacartUserId}:`, error);
      next(error);
    }
  }

  /**
   * DEMAND 3: Get demo user prediction comparison
   */
  async getDemoUserPrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      logger.info(`Getting demo prediction comparison for user: ${userId}`);
      
      // Fetch prediction from ML service
      const prediction = await mlService.getPredictionForDemo(userId);
      
      // Fetch ground truth from ML service  
      const groundTruth = await mlService.getGroundTruthBasket(userId);
      
      // Enrich both with product details from our database
      const [enrichedPrediction, enrichedGroundTruth] = await Promise.all([
        this.enrichProductList(prediction.predicted_products),
        this.enrichProductList(groundTruth.actual_products)
      ]);
      
      // Calculate comparison metrics
      const predictedIds = new Set(prediction.predicted_products);
      const actualIds = new Set(groundTruth.actual_products);
      const commonItems = [...predictedIds].filter(id => actualIds.has(id)).length;
      
      res.json({
        userId,
        predictedBasket: enrichedPrediction,
        trueFutureBasket: enrichedGroundTruth,
        comparisonMetrics: {
          predictedCount: prediction.predicted_products.length,
          actualCount: groundTruth.actual_products.length,
          commonItems
        }
      });
      
    } catch (error) {
      logger.error(`Error getting demo prediction for user ${req.params.userId}:`, error);
      next(error);
    }
  }

  /**
   * Helper method to enrich product IDs with details
   */
  private async enrichProductList(productIds: string[]): Promise<any[]> {
    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      include: [{ model: Category, as: 'category' }]
    });
    
    return products.map(product => ({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.price,
      category: product.category?.name
    }));
  }

  /**
   * Get demo user IDs metadata
   */
  async getDemoUserIds(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        message: "Demo system accepts ANY Instacart user ID",
        note: "Enter any user ID from the Instacart dataset",
        feature_engineering: "black_box",
        restriction: "User must exist in Instacart CSV files"
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // DASHBOARD & MONITORING (Essential admin functionality)
  // ============================================================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [totalUsers, totalProducts, totalOrders] = await Promise.all([
        User.count(),
        Product.count(),
        Order.count()
      ]);
      
      res.json({
        totalUsers,
        totalProducts, 
        totalOrders,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      next(error);
    }
  }

  /**
   * Get system health
   */
  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      // Test database connectivity
      const dbHealth = await User.count().then(() => true).catch(() => false);
      
      // Test ML service connectivity
      let mlHealth = false;
      try {
        await mlService.checkMLServiceHealth();
        mlHealth = true;
      } catch (error) {
        logger.warn('ML service health check failed:', error);
      }
      
      res.json({
        database: dbHealth ? 'healthy' : 'unhealthy',
        mlService: mlHealth ? 'healthy' : 'unhealthy',
        overall: dbHealth && mlHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error checking system health:', error);
      next(error);
    }
  }

  /**
   * Get ML service status
   */
  async getMLServiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceInfo = await mlService.getServiceStats();
      const healthCheck = await mlService.checkMLServiceHealth();
      
      res.json({
        ...serviceInfo,
        health: healthCheck,
        architecture: "direct_database_access",
        feature_engineering: "black_box",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error checking ML service status:', error);
      next(error);
    }
  }

  /**
   * Get architecture status
   */
  async getArchitectureStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Test database connectivity
      const dbHealth = await User.count().then(() => true).catch(() => false);
      
      // Get service stats
      let mlServiceInfo = null;
      let serviceStats = null;
      let mlHealth = false;
      
      try {
        mlServiceInfo = await mlService.getServiceStats();
        const healthResponse = await mlService.checkMLServiceHealth();
        mlHealth = healthResponse.status === 'healthy';
        serviceStats = { mlService: mlServiceInfo };
      } catch (error) {
        logger.warn('ML service info unavailable:', error);
        serviceStats = { mlService: { status: 'unavailable' } };
      }

      const overallHealth = dbHealth && mlHealth;

      res.json({
        status: overallHealth ? 'healthy' : 'degraded',
        architecture: "direct_database_access",
        feature_engineering: "black_box",
        services: {
          database: { status: dbHealth ? 'healthy' : 'unhealthy', connection: dbHealth },
          mlService: { status: mlHealth ? 'healthy' : 'unhealthy', connection: mlHealth }
        },
        stats: serviceStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error checking architecture status:', error);
      next(error);
    }
  }

  // ============================================================================
  // READ-ONLY DATA VIEWS (No CRUD operations)
  // ============================================================================

  /**
   * Get products (read-only view for admin dashboard)
   */
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await Product.findAll({
        include: [{ model: Category, as: 'category' }],
        limit: 50,
        order: [['createdAt', 'DESC']]
      });
      res.json({ products, message: 'Read-only view - products managed via database seeding' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users (read-only view for admin dashboard)
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        limit: 50,
        order: [['createdAt', 'DESC']]
      });
      res.json({ users, message: 'Read-only view - includes demo users' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get orders (read-only view for admin dashboard)
   */
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await Order.findAll({
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: OrderItem, as: 'items' }
        ],
        limit: 50,
        order: [['createdAt', 'DESC']]
      });
      res.json({ orders, message: 'Read-only view - includes seeded demo orders' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // REMOVED METHODS (Product/Category CRUD):
  // - createProduct, updateProduct, deleteProduct
  // - createCategory, updateCategory, deleteCategory  
  // - updateUser, deleteUser
  // - updateOrderStatus
  //
  // All product/category management is now done via database seeding only.
  // This eliminates complexity and focuses the admin panel on ML demo features:
  // 1. Model evaluation and monitoring
  // 2. Demo user seeding and prediction testing
  // 3. Read-only dashboard views
  // ============================================================================
}