import { Request, Response, NextFunction } from 'express';
import { ModelMetric } from '../models/modelMetric.model';
import { User, UserRole } from '../models/user.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model'; // If needed for other admin functions
import { Order } from '../models/order.model';       // If needed for other admin functions
import { mlApiClient } from '../services/ml.service'; // To call your ML service
import logger from '../utils/logger'; // Assuming your logger is in utils

// These should be actual user_ids (as strings) from the Instacart dataset
// that are present in your generated instacart_keyset_0.json (preferably from 'test' set)
// and for whom data exists in instacart_history.csv and instacart_future.csv.
// The ML service demo endpoints will use these IDs to fetch data from those CSVs.
const DEMO_INSTACART_USER_IDS: string[] = ['1', '7', '13', '25', '31', '42', '55', '60', '78', '92']; // Example IDs

// Define a type for the plain object version of a product
type PlainProduct = {
    id: string;
    sku: string;
    name: string;
    imageUrl?: string;
    price: number;
    salePrice: number;
    // Add any other properties you select from the DB and use
};

// Helper for placeholder images if needed directly in controller (though product.imageUrl should be primary)
const getSafePlaceholderImageUrlForDemo = (seedText?: string | null, width = 100, height = 100): string => {
    let seed = 0;
    const textToSeed = seedText || `product_fallback_${Math.floor(Math.random() * 10000)}`;
    for (let i = 0; i < textToSeed.length; i++) {
        seed = (seed + textToSeed.charCodeAt(i) * (i + 1)) % 1000;
    }
    return `https://picsum.photos/seed/${seed + 3000}/${width}/${height}`; // Different seed base
};

export class AdminController {
    /**
     * Triggers a new model evaluation in the ML service.
     */
    async triggerModelEvaluation(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Received request to trigger model evaluation.');
            
            // Call the ML service's /evaluate endpoint
            const evaluationResponse = await mlApiClient.post('/evaluate');

            logger.info('Model evaluation completed successfully in ML service.');
        
            //Forward the entire response from the ml-service to the frontend
            res.status(200).json(evaluationResponse.data);

        } catch (error) {
            logger.error('Error in backend while triggering model evaluation:', error);
            next(error);
        }
    }

    /**
     * Returns a list of predefined Instacart User IDs for demo purposes.
     */
    async getDemoUserIds(req: Request, res: Response, next: NextFunction) {
        try {
            // These IDs must correspond to users for whom data exists in
            // instacart_history.csv and instacart_future.csv used by the ML service.
            res.json(DEMO_INSTACART_USER_IDS);
        } catch (error) {
            logger.error('Error fetching demo user IDs:', error);
            next(error);
        }
    }

    /**
     * Fetches an AI-predicted basket and the actual future basket for a given Instacart User ID for demo.
     */
    async getDemoUserPrediction(req: Request, res: Response, next: NextFunction) {
        const { userId: instacartUserIdStr } = req.params; // This is the Instacart User ID (string)
        
        if (!DEMO_INSTACART_USER_IDS.includes(instacartUserIdStr)) {
            logger.warn(`Attempt to get demo prediction for non-configured Instacart User ID: ${instacartUserIdStr}`);
            return res.status(404).json({ error: `Demo user ID ${instacartUserIdStr} is not configured or invalid.` });
        }

        logger.info(`Fetching demo prediction for Instacart User ID: ${instacartUserIdStr}`);

        try {
            // 1. Call ML service to get AI prediction based on user's Instacart history
            const mlPredictionResponse = await mlApiClient.post('/predict/for-user-history', {
                user_id: instacartUserIdStr, // ML service expects this as the Instacart user_id
            });
            // Expected: { predictions: [{productId: INT, quantity: INT, score: FLOAT}, ...] }
            const predictedItemsFromML: { productId: number; quantity: number; score: number }[] = mlPredictionResponse.data.predictions;
            logger.debug(`ML predicted items for Instacart User ${instacartUserIdStr}:`, predictedItemsFromML);


            // 2. Call ML service to get the "true" future basket for this Instacart user ID
            const trueFutureResponse = await mlApiClient.get(`/debug/user-future-basket/${instacartUserIdStr}`);
            // Expected: { user_id: INT, products: [INT, INT, ...] }
            const trueFutureProductIdsFromML: number[] = trueFutureResponse.data.products;
            logger.debug(`ML true future product IDs for Instacart User ${instacartUserIdStr}:`, trueFutureProductIdsFromML);

            // 3. Prepare SKUs for database lookup (standardized 7-digit padding)
            const predictedProductSkus = predictedItemsFromML.map(p => `PROD-${String(p.productId).padStart(7, '0')}`);
            const trueFutureProductSkus = trueFutureProductIdsFromML.map(id => `PROD-${String(id).padStart(7, '0')}`);
            const allUniqueSkusToFetch = [...new Set([...predictedProductSkus, ...trueFutureProductSkus])];

            logger.debug(`Looking up SKUs in DB for demo Instacart User ${instacartUserIdStr}: ${allUniqueSkusToFetch.join(', ')}`);

            // 4. Fetch product details from your application's 'products' table using these SKUs
            const productsInDb = await Product.findAll({
                where: { sku: allUniqueSkusToFetch },
                attributes: ['id', 'sku', 'name', 'imageUrl', 'price', 'salePrice'], // Add other needed fields
            });

            const productMapBySku = new Map(productsInDb.map(p => [p.sku, p.toJSON()]));
            logger.debug(`Found ${productsInDb.length} products in DB for ${allUniqueSkusToFetch.length} unique SKUs. Mapped: ${productMapBySku.size}`);

            // 5. Assemble the detailed predicted basket
            const detailedPredictedBasket = predictedItemsFromML.map(p_ml => {
                const sku = `PROD-${String(p_ml.productId).padStart(7, '0')}`;
                const productDetail = productMapBySku.get(sku);
                if (!productDetail) {
                    logger.warn(`SKU ${sku} (Instacart ID ${p_ml.productId}) not found in DB for predicted basket of user ${instacartUserIdStr}.`);
                }
                return productDetail ? {
                    ...(productDetail as any), // Cast to ensure type compatibility
                    predictedQuantity: p_ml.quantity,
                    confidenceScore: p_ml.score,
                } : {
                    id: String(p_ml.productId), // Fallback ID
                    sku: sku,
                    name: `Unknown Product (ID: ${p_ml.productId})`,
                    predictedQuantity: p_ml.quantity,
                    confidenceScore: p_ml.score,
                    imageUrl: getSafePlaceholderImageUrlForDemo(`unknown_${p_ml.productId}`),
                    price: 0, salePrice: 0
                };
            });

            // 6. Assemble the detailed true future basket
            const detailedTrueFutureBasket = trueFutureProductSkus.map(sku => {
                const productDetail = productMapBySku.get(sku);
                if (!productDetail) {
                    logger.warn(`SKU ${sku} not found in DB for true future basket of user ${instacartUserIdStr}.`);
                }
                return productDetail ? (productDetail as any) : {
                    id: sku.replace('PROD-', '').replace(/^0+/, ''), // Fallback ID
                    sku: sku,
                    name: `Unknown Product (SKU: ${sku})`,
                    imageUrl: getSafePlaceholderImageUrlForDemo(`unknown_${sku}`),
                    price: 0, salePrice: 0
                };
            });

            res.json({
                userId: instacartUserIdStr,
                predictedBasket: detailedPredictedBasket,
                trueFutureBasket: detailedTrueFutureBasket,
            });

        } catch (error: any) {
            logger.error(`Error in getDemoUserPrediction for Instacart User ID ${instacartUserIdStr}: ${error.message}`, { 
                stack: error.stack,
                mlResponseData: (error as any).response?.data 
            });
            next(error); // Pass to global error handler
        }
    }

    async getFeatureImportance(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('Requesting feature importance from ML service...');
            // The mlApiClient makes a GET request to the ml-service
            const response = await mlApiClient.get('/model/feature-importance');
            res.json(response.data);
        } catch (error) {
            logger.error('Error fetching feature importance:', error);
            next(error);
        }
    }

    // Placeholder for other admin functionalities
    // async getDashboardStats(req: Request, res: Response, next: NextFunction) { /* ... */ }
    // async getUsers(req: Request, res: Response, next: NextFunction) { /* ... */ }
    // async updateUserStatus(req: Request, res: Response, next: NextFunction) { /* ... */ }
}