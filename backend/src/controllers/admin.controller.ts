// backend/src/controllers/admin.controller.ts
// FIXED: Removed hardcoded user ID restrictions to allow ANY Instacart user ID

import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/user.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/orderItem.model';
import { mlApiClient } from '../services/ml.service';
import * as mlService from '../services/ml.service';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';

export class AdminController {
    
    // ============================================================================
    // ML MODEL EVALUATION & MONITORING (BLACK BOX)
    // ============================================================================
    
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
     * Get ML service status
     */
    async getMLServiceStatus(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Checking ML service status...');
            
            // Check ML service health
            const healthResponse = await mlService.checkMLServiceHealth();
            
            // Check database connectivity from ML service
            const dbStatusResponse = await mlService.checkDatabaseStatus();
            
            res.json({
                status: healthResponse.status || 'unknown',
                health: healthResponse,
                database: dbStatusResponse,
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
     * Get comprehensive architecture status
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
                    mlService: { status: mlHealth ? 'healthy' : 'unhealthy', connection: mlHealth, info: mlServiceInfo }
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
    // DEMO PREDICTION SYSTEM (ML-FAITHFUL) - FIXED: NO HARDCODED LIMITATIONS
    // ============================================================================

    /**
     * FIXED: Now returns a message that ANY Instacart user ID can be used
     * No longer restricted to hardcoded list
     */
    async getDemoUserIds(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({
                message: "Any valid Instacart user ID can be used for demo prediction",
                note: "The system will validate user existence in the Instacart dataset",
                feature_engineering: "black_box",
                restriction: "none"
            });
        } catch (error) {
            logger.error('Error in getDemoUserIds:', error);
            next(error);
        }
    }

    /**
     * DEMAND 3: Get live demo prediction comparison (AI vs actual ground truth)
     * FIXED: Now accepts ANY Instacart user ID - no hardcoded restrictions
     */
    async getDemoUserPrediction(req: Request, res: Response, next: NextFunction) {
        const { userId: instacartUserIdStr } = req.params;
        
        // FIXED: Removed hardcoded user ID check - now accepts ANY user ID
        logger.info(`Fetching LIVE demo prediction for Instacart User ID: ${instacartUserIdStr}`);

        try {
            // 1. Call ML service endpoint that performs a temporary prediction from CSVs
            const mlPredictionResponse = await mlService.getPredictionForDemo(instacartUserIdStr);
            const { predicted_products, user_id } = mlPredictionResponse;

            // 2. Get ground truth basket from a separate ML service endpoint
            const trueFutureResponse = await mlService.getGroundTruthBasket(instacartUserIdStr);
            const trueFutureProductIds = trueFutureResponse.products || [];

            // 3. Collect all unique product IDs to fetch details from our DB
            const allProductIds = [...new Set([...predicted_products, ...trueFutureProductIds])];
            const allProductSkus = allProductIds.map((id: number) => `PROD-${String(id).padStart(7, '0')}`);
            
            // 4. Enrich with product details from our application's database
            const products = await Product.findAll({
                where: { sku: allProductSkus },
                include: [{ model: Category, attributes: ['name'] }]
            });
            const productMapBySku = new Map(products.map(p => [p.sku, p]));

            // 5. Build detailed predicted basket for the frontend
            const detailedPredictedBasket = predicted_products.map((productId: number) => {
                const product = productMapBySku.get(`PROD-${String(productId).padStart(7, '0')}`);
                return product ? {
                    id: product.id, name: product.name, imageUrl: product.imageUrl, price: product.price, category: product.category?.name
                } : null;
            }).filter(Boolean);

            // 6. Build detailed ground truth basket for the frontend
            const detailedTrueFutureBasket = trueFutureProductIds.map((productId: number) => {
                const product = productMapBySku.get(`PROD-${String(productId).padStart(7, '0')}`);
                return product ? {
                    id: product.id, name: product.name, imageUrl: product.imageUrl, price: product.price, category: product.category?.name
                } : null;
            }).filter(Boolean);
            
            res.json({
                userId: user_id,
                predictedBasket: detailedPredictedBasket,
                trueFutureBasket: detailedTrueFutureBasket,
                architecture: "direct_database_access",
                feature_engineering: "black_box",
                comparisonMetrics: {
                    predictedCount: detailedPredictedBasket.length,
                    actualCount: detailedTrueFutureBasket.length,
                    commonItems: detailedPredictedBasket.filter(p => detailedTrueFutureBasket.some(t => t!.id === p!.id)).length
                }
            });

        } catch (error: any) {
            logger.error(`Error in live demo prediction for user ${instacartUserIdStr}:`, error);
            
            // Handle specific ML service errors gracefully
            if (error.response?.status === 404) {
                return res.status(404).json({ 
                    error: `No data found for Instacart user ID ${instacartUserIdStr}. This user may not exist in the dataset or may not have sufficient purchase history.` 
                });
            }
            
            next(error);
        }
    }

    /**
     * DEMAND 1: Seed a new user into the database using Instacart history.
     * FIXED: Now accepts ANY Instacart user ID - no hardcoded restrictions
     */
    async seedDemoUser(req: Request, res: Response, next: NextFunction) {
        const { instacartUserId } = req.params;
        const email = `demo-user-${instacartUserId}@timely.com`;
  
        try {
            let user = await User.findOne({ where: { email } });
            if (user) {
                return res.status(409).json({ message: 'This demo user has already been seeded.' });
            }

            const hashedPassword = await bcrypt.hash('password123', 10);
            user = await User.create({
                email, password: hashedPassword, firstName: 'Demo', lastName: `User ${instacartUserId}`, 
                role: 'user', isActive: true, emailVerified: true
            });

            // FIXED: Now calls ML service with ANY user ID (no validation against hardcoded list)
            const instacartHistory = await mlService.getInstacartUserOrderHistory(instacartUserId);
            
            if (!instacartHistory || !instacartHistory.orders || instacartHistory.orders.length === 0) {
                return res.status(404).json({ 
                    error: `No order history found for Instacart user ID ${instacartUserId}. This user may not exist in the dataset or may not have purchase history.` 
                });
            }

            let ordersCreated = 0;
            for (const instacartOrder of instacartHistory.orders) {
                const productSkus = instacartOrder.products.map((id: number) => `PROD-${String(id).padStart(7, '0')}`);
                const products = await Product.findAll({ where: { sku: productSkus } });

                if (products.length === 0) continue;

                const subtotal = products.reduce((sum, p) => sum + p.price, 0);

                const order = await Order.create({
                    userId: user.id,
                    orderNumber: `DEMO-${user.id.substring(0, 4)}-${instacartOrder.order_id}`,
                    // CRITICAL: Use the exact historical temporal data for ML feature consistency
                    daysSincePriorOrder: instacartOrder.days_since_prior_order ?? 0,
                    orderDow: instacartOrder.order_dow,
                    orderHourOfDay: instacartOrder.order_hour_of_day,
                    status: 'delivered',
                    subtotal,
                    tax: 0,
                    deliveryFee: 0,
                    total: subtotal,
                    metadata: { isDemo: true, instacartUserId, temporalFieldsPreserved: true }
                });

                const orderItems = products.map(p => ({
                    orderId: order.id, productId: p.id, quantity: 1, price: p.price, total: p.price
                }));
                await OrderItem.bulkCreate(orderItems);
                ordersCreated++;
            }

            if (ordersCreated === 0) {
                return res.status(404).json({ 
                    error: 'No valid orders could be created from Instacart history. The products may not be available in our catalog.' 
                });
            }

            logger.info(`Demo user ${instacartUserId} seeded successfully with ${ordersCreated} orders.`);
            res.status(201).json({
                message: `Demo user created and seeded with ${ordersCreated} orders. You can now log in with email: ${email} and password: password123`,
                user: { id: user.id, email: user.email },
                ordersCreated,
                loginCredentials: {
                    email: email,
                    password: 'password123'
                }
            });

        } catch (error: any) {
            logger.error(`Error seeding demo user ${instacartUserId}:`, error);
            
            // Handle specific ML service errors gracefully
            if (error.response?.status === 404) {
                return res.status(404).json({ 
                    error: `No order history found for Instacart user ID ${instacartUserId}. This user may not exist in the dataset.` 
                });
            }
            
            next(error);
        }
    }

    // ============================================================================
    // DASHBOARD & ANALYTICS (BLACK BOX)
    // ============================================================================

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
                architecture: "direct_database_access",
                feature_engineering: "black_box",
                services: {
                    database: { status: dbHealth ? 'healthy' : 'unhealthy', connection: dbHealth },
                    mlService: { status: mlHealth ? 'healthy' : 'unhealthy', connection: mlHealth }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error checking system health:', error);
            next(error);
        }
    }

    // ============================================================================
    // PRODUCT MANAGEMENT (PLACEHOLDER - Implement as needed)
    // ============================================================================

    async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement product management logic
            res.json({ message: "Product management endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement product creation logic
            res.json({ message: "Product creation endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement product update logic
            res.json({ message: "Product update endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement product deletion logic
            res.json({ message: "Product deletion endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    // ============================================================================
    // USER MANAGEMENT (PLACEHOLDER - Implement as needed)
    // ============================================================================

    async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement user management logic
            res.json({ message: "User management endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement user update logic
            res.json({ message: "User update endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement user deletion logic
            res.json({ message: "User deletion endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    // ============================================================================
    // ORDER MANAGEMENT (PLACEHOLDER - Implement as needed)
    // ============================================================================

    async getOrders(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement order management logic
            res.json({ message: "Order management endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }

    async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            // Implement order status update logic
            res.json({ message: "Order status update endpoint - implement as needed" });
        } catch (error) {
            next(error);
        }
    }
}