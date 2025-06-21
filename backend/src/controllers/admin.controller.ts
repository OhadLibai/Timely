// backend/src/controllers/admin.controller.ts
// UPDATED: Removed feature importance, added ML service monitoring

import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/user.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/orderItem.model';
import { mlApiClient } from '../services/ml.service';
import * as mlService from '../services/ml.service';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';

// Demo Instacart user IDs for prediction demonstration
const DEMO_INSTACART_USER_IDS: string[] = ['1', '7', '13', '25', '31', '42', '55', '60', '78', '92'];

export class AdminController {
    
    /**
     * Trigger model evaluation in ML service (BLACK BOX - no feature importance)
     */
    async triggerModelEvaluation(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Triggering model evaluation...');
            
            const evaluationResponse = await mlService.triggerModelEvaluation();
            
            logger.info('Model evaluation completed successfully');
            
            // Return evaluation results without feature importance
            res.status(200).json({
                message: "Model evaluation completed",
                metrics: evaluationResponse.metrics,
                feature_engineering: "black_box",
                timestamp: evaluationResponse.timestamp || new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error triggering model evaluation:', error);
            next(error);
        }
    }

    /**
     * Get demo user IDs for prediction demonstration
     */
    async getDemoUserIds(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({
                userIds: DEMO_INSTACART_USER_IDS,
                message: "Demo Instacart user IDs for prediction testing",
                count: DEMO_INSTACART_USER_IDS.length
            });
        } catch (error) {
            logger.error('Error fetching demo user IDs:', error);
            next(error);
        }
    }

    /**
     * Get demo prediction comparison (AI vs actual)
     */
    async getDemoUserPrediction(req: Request, res: Response, next: NextFunction) {
        const { userId: instacartUserIdStr } = req.params;
        
        if (!DEMO_INSTACART_USER_IDS.includes(instacartUserIdStr)) {
            logger.warn(`Invalid demo user ID: ${instacartUserIdStr}`);
            return res.status(404).json({ 
                error: `Demo user ID ${instacartUserIdStr} is not configured` 
            });
        }

        logger.info(`Fetching demo prediction for Instacart User ID: ${instacartUserIdStr}`);

        try {
            // 1. Call ML service for AI prediction
            const mlPredictionResponse = await mlApiClient.post('/predict/for-user-history', {
                user_id: instacartUserIdStr,
            });
            const predictedItemsFromML = mlPredictionResponse.data.predictions || [];

            // 2. Call ML service for ground truth
            const trueFutureResponse = await mlService.getGroundTruthBasket(instacartUserIdStr);
            const trueFutureProductIds = trueFutureResponse.products || [];

            // 3. Prepare product SKUs for database lookup
            const predictedProductSkus = predictedItemsFromML.map((p: any) => 
                `PROD-${String(p.productId).padStart(7, '0')}`
            );
            const trueFutureProductSkus = trueFutureProductIds.map((id: number) => 
                `PROD-${String(id).padStart(7, '0')}`
            );
            const allUniqueSkus = [...new Set([...predictedProductSkus, ...trueFutureProductSkus])];

            // 4. Fetch product details from database
            const products = await Product.findAll({
                where: { sku: allUniqueSkus },
                include: [{ model: Category, attributes: ['name'] }]
            });

            const productMapBySku = new Map(products.map(p => [p.sku, p]));

            // 5. Assemble detailed predicted basket
            const detailedPredictedBasket = predictedProductSkus.map((sku: string) => {
                const product = productMapBySku.get(sku);
                if (!product) {
                    logger.warn(`Product not found for SKU: ${sku}`);
                    return null;
                }
                
                const mlItem = predictedItemsFromML.find((p: any) => 
                    `PROD-${String(p.productId).padStart(7, '0')}` === sku
                );
                
                return {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    imageUrl: product.imageUrl,
                    price: product.price,
                    salePrice: product.isOnSale ? 
                        (product.price * (1 - product.salePercentage / 100)) : product.price,
                    category: product.category?.name,
                    confidenceScore: mlItem?.score || 0
                };
            }).filter(Boolean);

            // 6. Assemble detailed true future basket
            const detailedTrueFutureBasket = trueFutureProductSkus.map((sku: string) => {
                const product = productMapBySku.get(sku);
                if (!product) {
                    logger.warn(`Product not found for true future SKU: ${sku}`);
                    return null;
                }
                
                return {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    imageUrl: product.imageUrl,
                    price: product.price,
                    salePrice: product.isOnSale ? 
                        (product.price * (1 - product.salePercentage / 100)) : product.price,
                    category: product.category?.name
                };
            }).filter(Boolean);

            res.json({
                userId: instacartUserIdStr,
                predictedBasket: detailedPredictedBasket,
                trueFutureBasket: detailedTrueFutureBasket,
                feature_engineering: "black_box",
                comparisonMetrics: {
                    predictedCount: detailedPredictedBasket.length,
                    actualCount: detailedTrueFutureBasket.length,
                    commonItems: detailedPredictedBasket.filter(pred => 
                        detailedTrueFutureBasket.some(actual => actual.id === pred.id)
                    ).length
                }
            });

        } catch (error: any) {
            logger.error(`Error in demo prediction for user ${instacartUserIdStr}:`, error);
            next(error);
        }
    }

    /**
     * Seed demo user with order history from Instacart data
     */
    async seedDemoUser(req: Request, res: Response, next: NextFunction) {
        const { instacartUserId } = req.params;
        const email = `demo-${instacartUserId}@timely.com`;
  
        try {
            // 1. Check if user already exists
            let user = await User.findOne({ where: { email } });
            if (user) {
                return res.status(409).json({ 
                    message: 'This demo user has already been seeded.' 
                });
            }

            // 2. Create the new user
            const hashedPassword = await bcrypt.hash('password123', 10);
            user = await User.create({
                email,
                password: hashedPassword,
                firstName: 'Demo',
                lastName: `User ${instacartUserId}`,
                role: 'user',
                isActive: true,
                emailVerified: true
            });

            // 3. Get order history from ML service
            const orderHistory = await mlService.getInstacartUserHistory(instacartUserId);

            // 4. Create orders with proper temporal fields
            let orderCount = 0;
            for (const orderData of orderHistory) {
                orderCount++;
                
                // Calculate temporal fields for this order
                const orderDate = new Date();
                orderDate.setDate(orderDate.getDate() - (orderHistory.length - orderCount) * 7); // Weekly orders
                
                const daysSincePrior = orderCount === 1 ? 0 : 7; // Weekly pattern
                const orderDow = orderDate.getDay() === 0 ? 6 : orderDate.getDay() - 1; // Convert to 0=Monday
                const orderHourOfDay = 10; // Default shopping hour

                const order = await Order.create({
                    userId: user.id,
                    orderNumber: `DEMO-${instacartUserId}-${orderCount}`,
                    daysSincePriorOrder: daysSincePrior,
                    orderDow: orderDow,
                    orderHourOfDay: orderHourOfDay,
                    status: 'delivered',
                    subtotal: 50.00,
                    tax: 4.38,
                    deliveryFee: 0,
                    total: 54.38,
                    paymentStatus: 'paid',
                    createdAt: orderDate
                });

                // Create order items (mock products with generated IDs)
                const orderItems = orderData.product_id.map((productId: number) => ({
                    orderId: order.id,
                    productId: `00000000-0000-0000-0000-${String(productId).padStart(12, '0')}`, // Mock UUID
                    quantity: 1,
                    price: 3.99,
                    total: 3.99
                }));
                
                await OrderItem.bulkCreate(orderItems);
            }

            res.status(201).json({ 
                message: `Successfully seeded demo user ${email} with ${orderHistory.length} orders`,
                user: {
                    id: user.id,
                    email: user.email,
                    orderCount: orderHistory.length
                }
            });

        } catch (error) {
            logger.error(`Error seeding demo user ${instacartUserId}:`, error);
            next(error);
        }
    }

    /**
     * NEW: ML Service health monitoring
     */
    async getMLServiceStatus(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Checking ML service health status...');
            
            const [mlHealth, databaseStatus, serviceStats] = await Promise.allSettled([
                mlService.checkMLServiceHealth(),
                mlService.checkDatabaseStatus(),
                mlService.getServiceStats()
            ]);
            
            res.json({
                mlService: mlHealth.status === 'fulfilled' ? mlHealth.value : { error: mlHealth.reason?.message },
                database: databaseStatus.status === 'fulfilled' ? databaseStatus.value : { error: databaseStatus.reason?.message },
                stats: serviceStats.status === 'fulfilled' ? serviceStats.value : { error: serviceStats.reason?.message },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error checking ML service status:', error);
            res.status(503).json({
                error: 'Unable to check ML service status',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * NEW: Architecture status overview
     */
    async getArchitectureStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const mlHealth = await mlService.checkMLServiceHealth();
            
            const architectureInfo = {
                deployment_version: "2.0.0",
                architecture_type: "direct_database_access",
                feature_engineering: "black_box",
                database_connected: mlHealth.services?.database === 'Connected',
                model_loaded: mlHealth.services?.model === 'Loaded',
                prediction_service: mlHealth.services?.prediction_service || 'Unknown',
                endpoints: {
                    primary: '/predict/from-database',
                    legacy_fallback: '/predict/from-db-history',
                    demo_data: '/demo-data/*',
                    health_check: '/health'
                },
                features: {
                    direct_database_access: true,
                    temporal_field_storage: true,
                    backend_data_fetching: false,
                    feature_importance_exposure: false
                },
                performance: {
                    eliminated_backend_queries: true,
                    centralized_ml_logic: true,
                    black_box_feature_engineering: true
                }
            };

            res.json(architectureInfo);

        } catch (error) {
            logger.error('Error getting architecture status:', error);
            res.status(503).json({
                error: 'Unable to get architecture status',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Dashboard statistics (simplified)
     */
    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate } = req.query;
            
            // Get basic statistics
            const totalUsers = await User.count();
            const totalOrders = await Order.count();
            const totalRevenue = await Order.sum('total') || 0;
            const totalProducts = await Product.count();

            // Get recent activity
            const recentOrders = await Order.findAll({
                limit: 10,
                order: [['createdAt', 'DESC']],
                include: [{ model: User, attributes: ['firstName', 'lastName'] }]
            });

            res.json({
                overview: {
                    totalUsers,
                    totalOrders,
                    totalRevenue: totalRevenue.toFixed(2),
                    totalProducts
                },
                recentActivity: recentOrders.map(order => ({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    customerName: `${order.user.firstName} ${order.user.lastName}`,
                    total: order.total,
                    status: order.status,
                    createdAt: order.createdAt
                })),
                mlService: {
                    feature_engineering: "black_box",
                    direct_database_access: true
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            next(error);
        }
    }

    // REMOVED: getFeatureImportance method (feature engineering is now black box)
}