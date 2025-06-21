// backend/src/controllers/admin.controller.ts
// UPDATED: Removed feature importance, black box ML, maintained demo functionality

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
     * Trigger BLACK BOX model evaluation (no feature importance exposure)
     */
    async triggerModelEvaluation(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Triggering BLACK BOX model evaluation...');
            
            const evaluationResponse = await mlService.triggerModelEvaluation();
            
            logger.info('BLACK BOX model evaluation completed successfully');
            
            // Return evaluation results WITHOUT feature importance
            res.status(200).json({
                message: "Model evaluation completed",
                metrics: evaluationResponse.metrics,
                architecture: "direct_database_access",
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
                count: DEMO_INSTACART_USER_IDS.length,
                feature_engineering: "black_box"
            });
        } catch (error) {
            logger.error('Error fetching demo user IDs:', error);
            next(error);
        }
    }

    /**
     * Get demo prediction comparison (AI vs actual) - MAINTAINED FUNCTIONALITY
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
            // 1. Call ML service for AI prediction using BLACK BOX
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

            // Return demo comparison - BLACK BOX approach
            res.json({
                userId: instacartUserIdStr,
                predictedBasket: detailedPredictedBasket,
                trueFutureBasket: detailedTrueFutureBasket,
                architecture: "direct_database_access",
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
                    message: 'This demo user has already been seeded.',
                    feature_engineering: "black_box"
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

            // 3. Get Instacart order history for this user (BLACK BOX)
            const instacartHistory = await mlService.getInstacartUserOrderHistory(parseInt(instacartUserId));
            
            if (!instacartHistory.orders || instacartHistory.orders.length === 0) {
                return res.status(404).json({ 
                    error: 'No order history found for this Instacart user ID',
                    feature_engineering: "black_box"
                });
            }

            // 4. Create orders in our database with EXACT temporal calculations
            for (const instacartOrder of instacartHistory.orders) {
                const productSkus = instacartOrder.products.map((productId: number) => 
                    `PROD-${String(productId).padStart(7, '0')}`
                );

                const products = await Product.findAll({
                    where: { sku: productSkus }
                });

                if (products.length === 0) continue;

                // Calculate order total
                const orderTotal = products.reduce((sum, product) => sum + product.price, 0);

                // Create order with TEMPORAL FIELDS (exact as Instacart training data)
                const order = await Order.create({
                    userId: user.id,
                    orderNumber: `DEMO-${user.id}-${instacartOrder.order_number}`,
                    // CRITICAL: Use exact temporal fields from Instacart data
                    daysSincePriorOrder: instacartOrder.days_since_prior_order,
                    orderDow: instacartOrder.order_dow,
                    orderHourOfDay: instacartOrder.order_hour_of_day,
                    status: 'completed',
                    subtotal: orderTotal,
                    total: orderTotal
                });

                // Create order items
                for (const product of products) {
                    await OrderItem.create({
                        orderId: order.id,
                        productId: product.id,
                        quantity: 1,
                        price: product.price,
                        total: product.price
                    });
                }
            }

            logger.info(`Demo user ${instacartUserId} seeded successfully with ${instacartHistory.orders.length} orders`);

            res.status(201).json({
                message: `Demo user created and seeded with ${instacartHistory.orders.length} orders`,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                },
                ordersCreated: instacartHistory.orders.length,
                architecture: "direct_database_access",
                feature_engineering: "black_box"
            });

        } catch (error: any) {
            logger.error(`Error seeding demo user ${instacartUserId}:`, error);
            next(error);
        }
    }

    /**
     * Get admin dashboard statistics - BLACK BOX approach
     */
    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const [totalUsers, totalProducts, totalOrders] = await Promise.all([
                User.count({ where: { role: UserRole.USER } }),
                Product.count({ where: { isActive: true } }),
                Order.count()
            ]);

            // Get ML service stats without exposing internals
            let mlServiceStats = null;
            try {
                const mlStatsResponse = await mlApiClient.get('/service-info');
                mlServiceStats = {
                    status: mlStatsResponse.data.mode || 'unknown',
                    architecture: mlStatsResponse.data.architecture || 'unknown',
                    feature_engineering: "black_box"
                };
            } catch (error) {
                logger.warn('Could not fetch ML service stats:', error);
            }

            res.json({
                totalUsers,
                totalProducts,
                totalOrders,
                mlService: mlServiceStats,
                architecture: "direct_database_access",
                feature_engineering: "black_box",
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching dashboard stats:', error);
            next(error);
        }
    }

    /**
     * Get system health status - BLACK BOX approach
     */
    async getSystemHealth(req: Request, res: Response, next: NextFunction) {
        try {
            // Test database connectivity
            const dbHealth = await User.count().then(() => true).catch(() => false);
            
            // Test ML service health
            let mlHealth = false;
            try {
                const mlResponse = await mlApiClient.get('/health');
                mlHealth = mlResponse.status === 200;
            } catch (error) {
                logger.warn('ML service health check failed:', error);
            }

            const overallHealth = dbHealth && mlHealth;

            res.json({
                status: overallHealth ? 'healthy' : 'degraded',
                services: {
                    database: dbHealth ? 'healthy' : 'unhealthy',
                    mlService: mlHealth ? 'healthy' : 'unhealthy'
                },
                architecture: "direct_database_access",
                feature_engineering: "black_box",
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error checking system health:', error);
            next(error);
        }
    }
}