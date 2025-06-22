// backend/src/controllers/admin.controller.ts

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

// Demo Instacart user IDs for prediction demonstration
const DEMO_INSTACART_USER_IDS: string[] = ['1', '7', '13', '25', '31', '42', '55', '60', '78', '92'];

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
            
            res.status(503).json({
                status: 'unreachable',
                message: 'ML service is not responding',
                architecture: "direct_database_access",
                feature_engineering: "black_box",
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get architecture status
     */
    async getArchitectureStatus(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Checking system architecture status...');
            const dbHealth = await User.count().then(() => true).catch(() => false);
            
            let mlHealth = false;
            let mlServiceInfo = null;
            try {
                const mlResponse = await mlApiClient.get('/health');
                mlHealth = mlResponse.status === 200;
                mlServiceInfo = mlResponse.data;
            } catch (error) {
                logger.warn('ML service health check failed:', error);
            }

            let serviceStats = null;
            try {
                serviceStats = await mlService.getServiceStats();
            } catch (error) {
                logger.warn('Could not fetch service stats:', error);
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
    // DEMO PREDICTION SYSTEM (ML-FAITHFUL)
    // ============================================================================

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
     * DEMAND 3: Get live demo prediction comparison (AI vs actual ground truth)
     * This flow is TEMPORARY and does NOT use the app's database for history.
     * It calls the ML service, which reads the original CSVs to perform this demo.
     */
    async getDemoUserPrediction(req: Request, res: Response, next: NextFunction) {
        const { userId: instacartUserIdStr } = req.params;
        
        if (!DEMO_INSTACART_USER_IDS.includes(instacartUserIdStr)) {
            return res.status(404).json({ error: `Demo user ID ${instacartUserIdStr} is not a valid demo ID.` });
        }

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
            next(error);
        }
    }

    /**
     * DEMAND 1: Seed a new user into the database using Instacart history.
     * This creates a persistent, functional user account.
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
                email, password: hashedPassword, firstName: 'Demo', lastName: `User ${instacartUserId}`, role: 'user', isActive: true, emailVerified: true
            });

            const instacartHistory = await mlService.getInstacartUserOrderHistory(instacartUserId);
            
            if (!instacartHistory || !instacartHistory.orders || instacartHistory.orders.length === 0) {
                return res.status(404).json({ error: 'No order history found for this Instacart user ID.' });
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
                return res.status(404).json({ error: 'No valid orders could be created from Instacart history.' });
            }

            logger.info(`Demo user ${instacartUserId} seeded successfully with ${ordersCreated} orders.`);
            res.status(201).json({
                message: `Demo user created and seeded with ${ordersCreated} orders. You can now log in with email: ${email} and password: password123`,
                user: { id: user.id, email: user.email },
                ordersCreated
            });

        } catch (error: any) {
            logger.error(`Error seeding demo user ${instacartUserId}:`, error);
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

    // ============================================================================
    // PRODUCT MANAGEMENT (CRUD)
    // ============================================================================

    /**
     * Get all products with admin details
     */
    async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string;
            const category = req.query.category as string;
            const isActive = req.query.isActive as string;

            const offset = (page - 1) * limit;
            const whereClause: any = {};

            if (search) {
                whereClause.name = { [require('sequelize').Op.iLike]: `%${search}%` };
            }
            if (category) {
                whereClause.categoryId = category;
            }
            if (isActive !== undefined) {
                whereClause.isActive = isActive === 'true';
            }

            const { count, rows: products } = await Product.findAndCountAll({
                where: whereClause,
                include: [{ model: Category, attributes: ['id', 'name'] }],
                offset,
                limit,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                products,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            logger.error('Error fetching admin products:', error);
            next(error);
        }
    }

    /**
     * Create new product
     */
    async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const product = await Product.create(req.body);
            
            logger.info(`Product created: ${product.id}`);
            res.status(201).json(product);

        } catch (error) {
            logger.error('Error creating product:', error);
            next(error);
        }
    }

    /**
     * Update existing product
     */
    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const [updatedCount] = await Product.update(req.body, {
                where: { id: productId }
            });

            if (updatedCount === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const updatedProduct = await Product.findByPk(productId, {
                include: [{ model: Category, attributes: ['id', 'name'] }]
            });

            logger.info(`Product updated: ${productId}`);
            res.json(updatedProduct);

        } catch (error) {
            logger.error('Error updating product:', error);
            next(error);
        }
    }

    /**
     * Delete product
     */
    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const deletedCount = await Product.destroy({
                where: { id: productId }
            });

            if (deletedCount === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }

            logger.info(`Product deleted: ${productId}`);
            res.status(204).send();

        } catch (error) {
            logger.error('Error deleting product:', error);
            next(error);
        }
    }

    // ============================================================================
    // USER MANAGEMENT (CRUD)
    // ============================================================================

    /**
     * Get all users with admin details
     */
    async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string;
            const role = req.query.role as string;
            const isActive = req.query.isActive as string;

            const offset = (page - 1) * limit;
            const whereClause: any = {};

            if (search) {
                whereClause[require('sequelize').Op.or] = [
                    { firstName: { [require('sequelize').Op.iLike]: `%${search}%` } },
                    { lastName: { [require('sequelize').Op.iLike]: `%${search}%` } },
                    { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
                ];
            }
            if (role) {
                whereClause.role = role;
            }
            if (isActive !== undefined) {
                whereClause.isActive = isActive === 'true';
            }

            const { count, rows: users } = await User.findAndCountAll({
                where: whereClause,
                attributes: { exclude: ['password'] },
                offset,
                limit,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                users,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            logger.error('Error fetching admin users:', error);
            next(error);
        }
    }

    /**
     * Update user status/role
     */
    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const [updatedCount] = await User.update(req.body, {
                where: { id: userId }
            });

            if (updatedCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const updatedUser = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });

            logger.info(`User updated: ${userId}`);
            res.json(updatedUser);

        } catch (error) {
            logger.error('Error updating user:', error);
            next(error);
        }
    }

    /**
     * Delete user
     */
    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const deletedCount = await User.destroy({
                where: { id: userId }
            });

            if (deletedCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            logger.info(`User deleted: ${userId}`);
            res.status(204).send();

        } catch (error) {
            logger.error('Error deleting user:', error);
            next(error);
        }
    }

    // ============================================================================
    // ORDER MANAGEMENT
    // ============================================================================

    /**
     * Get all orders with admin details
     */
    async getOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string;
            const status = req.query.status as string;

            const offset = (page - 1) * limit;
            const whereClause: any = {};

            if (search) {
                whereClause.id = { [require('sequelize').Op.iLike]: `%${search}%` };
            }
            if (status) {
                whereClause.status = status;
            }

            const { count, rows: orders } = await Order.findAndCountAll({
                where: whereClause,
                include: [
                    { 
                        model: User, 
                        attributes: ['id', 'firstName', 'lastName', 'email'] 
                    },
                    { 
                        model: OrderItem,
                        include: [{ model: Product, attributes: ['name', 'imageUrl'] }]
                    }
                ],
                offset,
                limit,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                orders,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            logger.error('Error fetching admin orders:', error);
            next(error);
        }
    }

    /**
     * Update order status
     */
    async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            const [updatedCount] = await Order.update({ status }, {
                where: { id: orderId }
            });

            if (updatedCount === 0) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const updatedOrder = await Order.findByPk(orderId, {
                include: [
                    { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }
                ]
            });

            logger.info(`Order status updated: ${orderId} -> ${status}`);
            res.json(updatedOrder);

        } catch (error) {
            logger.error('Error updating order status:', error);
            next(error);
        }
    }
}