// backend/src/controllers/admin.controller.ts
// FIXED: Store instacart_user_id in metadata for demo users

import { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import * as bcrypt from 'bcryptjs';
import { User } from '@/models/user.model';
import { Product } from '@/models/product.model';
import { Order } from '@/models/order.model';
import { OrderItem } from '@/models/order-item.model';
import sequelize from '@/config/database';
import mlService from '@/services/ml.service';
import orderService from '@/services/order.service';
import logger from '@/utils/logger';

export class AdminController {
  
  /**
   * DEMAND 1: FIXED IMPLEMENTATION - Seed a demo user with instacart_user_id in metadata
   */
  async seedDemoUser(req: Request, res: Response, next: NextFunction) {
    const transaction: Transaction = await sequelize.transaction();
    
    try {
      const { instacartUserId } = req.params;
      
      logger.info(`Starting optimized demo user seeding for Instacart ID: ${instacartUserId}`);
      
      // Step 1: Validate Instacart user exists in CSV data first
      let orderHistory;
      try {
        orderHistory = await mlService.getInstacartUserOrderHistory(instacartUserId);
        if (!orderHistory?.orders || orderHistory.orders.length === 0) {
          return res.status(404).json({ 
            error: `No order history found for Instacart user ID ${instacartUserId}`,
            suggestion: 'Try user IDs: 1, 7, 13, 25, 31, 42, 55, 60, 78, 92'
          });
        }
      } catch (error) {
        logger.error(`ML service error for user ${instacartUserId}:`, error);
        return res.status(404).json({ 
          error: `User ${instacartUserId} not found in Instacart dataset`,
          suggestion: 'Please try a different user ID from the Instacart dataset'
        });
      }

      // Step 2: Create new user account with proper password hashing AND metadata
      const hashedPassword = await bcrypt.hash('demo_password', 12);
      const newUser = await User.create({
        email: `demo_user_${instacartUserId}@timely.demo`,
        password: hashedPassword,
        firstName: `Demo`,
        lastName: `User ${instacartUserId}`,
        isAdmin: false,
        isActive: true,
        // CRITICAL FIX: Store the original Instacart user ID in metadata
        metadata: {
          instacart_user_id: instacartUserId,
          source: 'instacart_dataset',
          seeded_at: new Date().toISOString()
        }
      }, { transaction });
      
      logger.info(`Created demo user: ${newUser.email} (ID: ${newUser.id}) with Instacart ID: ${instacartUserId}`);

      // Step 3: OPTIMIZATION - Pre-fetch all products to avoid N+1 queries
      const allProducts = await Product.findAll({
        attributes: ['id', 'name']
      });
      const productMap = new Map(allProducts.map(p => [p.name, p.id]));
      
      logger.info(`Pre-fetched ${allProducts.length} products for optimization`);

      // Step 4: BATCH INSERT OPTIMIZATION - Prepare all orders and items
      const ordersToCreate = [];
      const orderItemsToCreate = [];
      let totalOrderItems = 0;

      for (const [index, order] of orderHistory.orders.entries()) {
        const orderNumber = `DEMO-${instacartUserId}-${Date.now()}-${index}`;
        
        // Prepare order data
        const orderData = {
          id: uuidv4(),
          userId: newUser.id,
          orderNumber: orderNumber,
          status: 'completed',
          subtotal: 0,
          tax: 0,
          deliveryFee: 5.99,
          total: 0,
          paymentMethod: 'demo_payment',
          paymentStatus: 'completed',
          metadata: {
            instacart_order_id: order.order_id,
            instacart_order_number: order.order_number,
            source: 'instacart_demo_seed'
          },
          createdAt: new Date(order.order_date),
          updatedAt: new Date(order.order_date)
        };

        let orderSubtotal = 0;

        // Process order items
        for (const productData of order.products) {
          const productName = productData.product_name || productData.name || `Product ${productData}`;
          const mappedProductId = productMap.get(productName);
          
          if (mappedProductId) {
            const price = productData.price || 4.99;
            const quantity = 1;
            const itemTotal = price * quantity;
            
            orderItemsToCreate.push({
              id: uuidv4(),
              orderId: orderData.id,
              productId: mappedProductId,
              quantity: quantity,
              price: price,
              total: itemTotal,
              createdAt: orderData.createdAt,
              updatedAt: orderData.updatedAt
            });
            
            orderSubtotal += itemTotal;
            totalOrderItems++;
          }
        }

        // Update order totals
        orderData.subtotal = orderSubtotal;
        const taxAmount = orderSubtotal * 0.08;
        orderData.tax = taxAmount;
        orderData.total = orderSubtotal + taxAmount + orderData.deliveryFee;
        
        ordersToCreate.push(orderData);
      }

      // Step 5: BATCH INSERT - Create all orders and items efficiently
      logger.info(`Batch inserting ${ordersToCreate.length} orders...`);
      await Order.bulkCreate(ordersToCreate, { transaction });
      
      logger.info(`Batch inserting ${orderItemsToCreate.length} order items...`);
      await OrderItem.bulkCreate(orderItemsToCreate, { transaction });

      // Step 6: Commit transaction
      await transaction.commit();
      
      const ordersCreated = ordersToCreate.length;
      const orderItemsCreated = orderItemsToCreate.length;
      
      logger.info(`✅ Demo user seeding completed successfully. Orders: ${ordersCreated}, Items: ${orderItemsCreated}`);

      res.json({
        message: 'Demo user seeded successfully with order history',
        userId: newUser.id,
        instacartUserId: instacartUserId,
        email: newUser.email,
        password: 'demo_password',
        stats: {
          ordersCreated,
          orderItemsCreated,
          successRate: `${((orderItemsCreated / totalOrderItems) * 100).toFixed(1)}%`
        },
        loginInstructions: 'Use the email and password above to log in as this demo user'
      });
      
    } catch (error) {
      await transaction.rollback();
      logger.error(`Demo user seeding failed for user ${req.params.instacartUserId}:`, error);
      next(error);
    }
  }

  /**
   * DEMAND 3: Get demo user prediction with performance comparison
   */
  async getDemoUserPrediction(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      logger.info(`Generating demo prediction comparison for user ID: ${userId}`);
      
      const predictionResults = await mlService.getDemoUserPrediction(userId);
      
      res.json({
        message: 'Demo prediction comparison generated successfully',
        ...predictionResults,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error generating demo user prediction:', error);
      next(error);
    }
  }

  /**
   * DEMAND 1 & 3: Get available demo user IDs from ML service
   */
  async getDemoUserIds(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Fetching demo user IDs from ML service');
      
      const demoInfo = await mlService.getDemoUserIds();
      
      res.json({
        message: 'Demo user information retrieved successfully',
        ...demoInfo,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error fetching demo user IDs:', error);
      next(error);
    }
  }

  /**
   * DEMAND 2: Trigger ML model evaluation
   */
  async triggerModelEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Triggering ML model evaluation');
      
      const { sampleSize } = req.body;
      const evaluationResults = await mlService.triggerModelEvaluation(sampleSize);
      
      res.json({
        message: 'Model evaluation completed successfully',
        results: evaluationResults,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error triggering model evaluation:', error);
      next(error);
    }
  }

  /**
   * Get ML model performance metrics
   */
  async getModelPerformanceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Fetching model performance metrics');
      
      const metrics = await mlService.triggerModelEvaluation();
      
      res.json({
        message: 'Model performance metrics retrieved successfully',
        metrics,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error fetching model performance metrics:', error);
      next(error);
    }
  }

  /**
   * Get ML service status
   */
  async getMLServiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await mlService.getMLServiceStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error getting ML service status:', error);
      next(error);
    }
  }

  /**
   * Get overall architecture status
   */
  async getArchitectureStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const mlStatus = await mlService.getMLServiceStatus();
      
      res.json({
        status: 'operational',
        services: {
          backend: {
            status: 'healthy',
            database: 'connected',
            version: process.env.npm_package_version || '1.0.0'
          },
          mlService: mlStatus
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting architecture status:', error);
      next(error);
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [userCount, productCount, orderCount] = await Promise.all([
        User.count(),
        Product.count(),
        Order.count()
      ]);

      const recentOrders = await Order.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, attributes: ['email', 'firstName', 'lastName'] }]
      });

      res.json({
        stats: {
          users: userCount,
          products: productCount,
          orders: orderCount
        },
        recentOrders,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      next(error);
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const dbHealth = await sequelize.authenticate()
        .then(() => ({ status: 'healthy', message: 'Database connection successful' }))
        .catch(err => ({ status: 'unhealthy', message: err.message }));

      const mlHealth = await mlService.getMLServiceStatus()
        .catch(() => ({ isHealthy: false, error: 'ML service unreachable' }));

      res.json({
        status: dbHealth.status === 'healthy' && mlHealth.isHealthy ? 'healthy' : 'degraded',
        services: {
          database: dbHealth,
          mlService: mlHealth
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error checking system health:', error);
      next(error);
    }
  }

  /**
   * Get products (read-only)
   */
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows } = await Product.findAndCountAll({
        limit: Number(limit),
        offset,
        order: [['name', 'ASC']]
      });

      res.json({
        products: rows,
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit))
      });
    } catch (error) {
      logger.error('Error fetching products:', error);
      next(error);
    }
  }
}

// Export utilities if needed
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ============================================================================
// ARCHITECTURE FIX COMPLETE:
// 
// ✅ CRITICAL FIX IMPLEMENTED:
// - Now stores instacart_user_id in user metadata when seeding
// - This enables the ML service to detect demo users and use CSV data
// - Fixes Demand 1: prediction for seeded users will now work
// 
// ✅ MAINTAINED ALL FUNCTIONALITY:
// - User seeding with complete order history
// - Batch optimization for performance
// - Proper error handling and logging
// 
// The prediction pipeline is now complete:
// 1. Admin seeds user with Instacart ID
// 2. ID is stored in metadata
// 3. When prediction is requested, ML service checks metadata
// 4. If instacart_user_id exists, uses CSV data for prediction
// 5. Otherwise uses regular database prediction
// ============================================================================