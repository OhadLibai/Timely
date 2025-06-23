// backend/src/controllers/admin.controller.ts
// FIXED: Optimized seedDemoUser performance with pre-fetched products (R-2)

import { Request, Response, NextFunction } from 'express';
import { Op, Transaction } from 'sequelize';
import bcrypt from 'bcryptjs';
import logger from '@/utils/logger';
import { User, Product, Order, Category, OrderItem } from '@/models';
import * as mlService from '@/services/ml.service';
import { sequelize } from '@/config/database.config';

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
        message: 'Model evaluation completed successfully',
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
   * DEMAND 1: OPTIMIZED IMPLEMENTATION - Seed a demo user with pre-fetched products
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

      // Step 2: Create new user account with proper password hashing
      const hashedPassword = await bcrypt.hash('demo_password', 12);
      const newUser = await User.create({
        email: `demo_user_${instacartUserId}@timely.demo`,
        password: hashedPassword,
        firstName: `Demo`,
        lastName: `User ${instacartUserId}`,
        isAdmin: false,
        isActive: true
      }, { transaction });
      
      logger.info(`Created demo user: ${newUser.id} (${newUser.email})`);

      // Step 3: OPTIMIZATION - Pre-fetch ALL products once instead of querying in loop
      const allProductNames = new Set<string>();
      orderHistory.orders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
          order.products.forEach(productInfo => {
            if (typeof productInfo === 'string') {
              allProductNames.add(productInfo.toLowerCase());
            } else if (productInfo && typeof productInfo === 'object' && productInfo.name) {
              allProductNames.add(productInfo.name.toLowerCase());
            }
          });
        }
      });

      logger.info(`Pre-fetching ${allProductNames.size} unique products for performance optimization`);
      
      // Single database query to fetch all relevant products
      const availableProducts = await Product.findAll({
        attributes: ['id', 'name'],
        where: { 
          isActive: true,
          name: {
            [Op.in]: Array.from(allProductNames).map(name => 
              name.charAt(0).toUpperCase() + name.slice(1)
            )
          }
        },
        transaction
      });
      
      // Create in-memory map for O(1) product lookup
      const productMap = new Map(
        availableProducts.map(p => [p.name.toLowerCase(), p.id])
      );
      
      logger.info(`Built optimized product lookup map with ${productMap.size} products`);

      // Step 4: Calculate temporal fields and populate database with order history
      let previousOrderDate: Date | null = null;
      let ordersCreated = 0;
      let orderItemsCreated = 0;

      for (const [index, orderData] of orderHistory.orders.entries()) {
        try {
          // Calculate temporal fields for ML compatibility
          const orderDate = orderData.order_date 
            ? new Date(orderData.order_date) 
            : new Date(Date.now() - (orderHistory.orders.length - index) * 7 * 24 * 60 * 60 * 1000);

          const daysSincePriorOrder = previousOrderDate 
            ? Math.floor((orderDate.getTime() - previousOrderDate.getTime()) / (1000 * 60 * 60 * 24))
            : (orderData.days_since_prior_order || 7);

          // FIXED: Ensure temporal consistency by deriving from orderDate
          const orderDow = orderData.order_dow ?? orderDate.getDay();
          const orderHourOfDay = orderData.order_hour_of_day ?? orderDate.getHours();

          // Create order
          const order = await Order.create({
            userId: newUser.id,
            orderNumber: `DEMO-${instacartUserId}-${String(index + 1).padStart(3, '0')}`,
            daysSincePriorOrder,
            orderDow,
            orderHourOfDay,
            status: 'delivered',
            subtotal: 0, // Will calculate from items
            total: 0,    // Will calculate from items
            createdAt: orderDate,
            updatedAt: orderDate
          }, { transaction });

          ordersCreated++;
          previousOrderDate = orderDate;

          // Process products using optimized lookup
          for (const productInfo of orderData.products || []) {
            let productId: string | null = null;

            if (typeof productInfo === 'string') {
              // Direct product name lookup using pre-fetched map
              productId = productMap.get(productInfo.toLowerCase()) || null;
            } else if (productInfo && typeof productInfo === 'object' && productInfo.name) {
              // Product object with name property
              productId = productMap.get(productInfo.name.toLowerCase()) || null;
            }

            // Create order item if valid product found
            if (productId) {
              await OrderItem.create({
                orderId: order.id,
                productId,
                quantity: 1,
                price: 0, // Demo price
                total: 0  // Demo total
              }, { transaction });
              orderItemsCreated++;
            } else {
              logger.debug(`Skipped unknown product: ${JSON.stringify(productInfo)}`);
            }
          }

          logger.debug(`Created order ${order.orderNumber} with ${orderData.products.length} items`);

        } catch (orderError) {
          logger.error(`Error creating order ${index + 1} for user ${instacartUserId}:`, orderError);
          // Continue with next order instead of failing completely
        }
      }

      await transaction.commit();
      
      logger.info(`✅ Successfully seeded demo user ${newUser.id} with ${ordersCreated} orders and ${orderItemsCreated} items`);
      
      res.json({
        message: 'Demo user seeded successfully!',
        user: {
          id: newUser.id,
          email: newUser.email,
          instacartUserId: instacartUserId
        },
        stats: {
          ordersCreated,
          orderItemsCreated,
          optimizationUsed: 'pre_fetched_products'
        }
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

  // ============================================================================
  // DASHBOARD & MONITORING (Read-only)
  // ============================================================================

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await mlService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      next(error);
    }
  }

  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await mlService.getSystemHealth();
      res.json(health);
    } catch (error) {
      logger.error('Error fetching system health:', error);
      next(error);
    }
  }

  async getMLServiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await mlService.getServiceStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error fetching ML service status:', error);
      next(error);
    }
  }

  // ============================================================================
  // READ-ONLY DATA VIEWS
  // ============================================================================

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await Product.findAll({
        include: [{ model: Category, as: 'category' }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      
      res.json({
        products,
        total: products.length,
        note: 'Products are managed via database seeding only'
      });
    } catch (error) {
      logger.error('Error fetching products:', error);
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      
      res.json({
        users,
        total: users.length,
        note: 'Includes both registered users and seeded demo users'
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      next(error);
    }
  }

  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await Order.findAll({
        include: [
          { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: OrderItem, as: 'orderItems', include: [{ model: Product, as: 'product' }] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      
      res.json({
        orders,
        total: orders.length,
        note: 'Includes both real orders and seeded demo orders'
      });
    } catch (error) {
      logger.error('Error fetching orders:', error);
      next(error);
    }
  }

  async getDemoUserIds(req: Request, res: Response, next: NextFunction) {
    try {
      const demoInfo = await mlService.getDemoUserIds();
      res.json(demoInfo);
    } catch (error) {
      logger.error('Error fetching demo user IDs:', error);
      next(error);
    }
  }

  async getArchitectureStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await mlService.getArchitectureStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error fetching architecture status:', error);
      next(error);
    }
  }
}