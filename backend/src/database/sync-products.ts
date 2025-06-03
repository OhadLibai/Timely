// backend/src/database/sync-products.ts
import { sequelize } from '../config/database';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Interface matching the columns selected from products_staging
interface StagingProductRaw {
    id_instacart: number;
    sku: string;
    name: string;
    description?: string;
    price: number | null;
    compare_at_price?: number | null;
    unit?: string;
    unit_value?: number | null;
    brand?: string;
    tags_string?: string | null; // Comma-separated string of tags
    image_url?: string | null;
    category_id: string; // UUID from 'categories' table
    stock?: number | null;
    is_active?: boolean | null;
    nutritional_info_json?: string | null; // JSON string
    metadata_json?: string | null;       // JSON string
}

const getSafePlaceholderImageUrl = (seedText?: string | null, width = 300, height = 300): string => {
    let seed = 0;
    const textToSeed = seedText || `product_${Math.floor(Math.random() * 10000)}`;
    for (let i = 0; i < textToSeed.length; i++) {
        seed = (seed + textToSeed.charCodeAt(i) * (i + 1)) % 1000; // Keep seed within reasonable bounds and vary it a bit
    }
    return `https://picsum.photos/seed/${seed + 1000}/${width}/${height}`; // Add offset to seed for more variety
};

async function syncProductsFromStaging() {
    logger.info('Starting product sync from products_staging to main products table...');
    const transaction = await sequelize.transaction();

    try {
        const query = `
            SELECT 
                id_instacart, sku, name, description, price, compare_at_price, 
                unit, unit_value, brand, tags_string, image_url, category_id, 
                stock, is_active, nutritional_info_json, metadata_json 
            FROM products_staging;
        `;
        const [stagingProductsData] = await sequelize.query(query) as [StagingProductRaw[], any];
        
        logger.info(`Found ${stagingProductsData.length} products in staging table.`);

        let newProductsCount = 0;
        let updatedProductsCount = 0;
        let skippedInvalidCategory = 0;
        let skippedMissingSku = 0;

        for (const stagingProd of stagingProductsData) {
            if (!stagingProd.sku) {
                logger.warn(`Product with Instacart ID ${stagingProd.id_instacart} has no SKU. Skipping.`);
                skippedMissingSku++;
                continue;
            }
            if (!stagingProd.category_id) {
                logger.warn(`Product SKU ${stagingProd.sku} (Instacart ID ${stagingProd.id_instacart}) has no category_id. Skipping.`);
                skippedInvalidCategory++;
                continue;
            }

            // Verify category_id actually exists in the categories table
            const category = await Category.findByPk(stagingProd.category_id, { transaction });
            if (!category) {
                logger.warn(`Product SKU ${stagingProd.sku} (Instacart ID ${stagingProd.id_instacart}): Category ID ${stagingProd.category_id} not found in 'categories' table. Skipping.`);
                skippedInvalidCategory++;
                continue;
            }

            const existingProduct = await Product.findOne({
                where: { sku: stagingProd.sku },
                transaction,
            });

            const currentPrice = Number(stagingProd.price) || Math.round(Math.random() * 20 + 1) + 0.99; // Default price if null/0
            const currentCompareAtPrice = stagingProd.compare_at_price ? Number(stagingProd.compare_at_price) : undefined;
            const isOnSale = !!(currentCompareAtPrice && currentCompareAtPrice > currentPrice);
            let salePercentage = 0;
            if (isOnSale && currentCompareAtPrice && currentPrice) { // Ensure currentPrice is not 0 for division
                salePercentage = Number((((currentCompareAtPrice - currentPrice) / currentCompareAtPrice) * 100).toFixed(2));
            }
            
            let nutritionalInfo = {};
            try {
                if (stagingProd.nutritional_info_json) nutritionalInfo = JSON.parse(stagingProd.nutritional_info_json);
            } catch (e) { logger.warn(`Could not parse nutritional_info_json for SKU ${stagingProd.sku}`); }

            let metadata = {};
            try {
                if (stagingProd.metadata_json) metadata = JSON.parse(stagingProd.metadata_json);
            } catch (e) { logger.warn(`Could not parse metadata_json for SKU ${stagingProd.sku}`); }


            const productData: Partial<Product> = {
                name: stagingProd.name || `Product ${stagingProd.sku}`,
                description: stagingProd.description || `Description for ${stagingProd.name || stagingProd.sku}`,
                price: currentPrice,
                compareAtPrice: currentCompareAtPrice,
                unit: stagingProd.unit || 'unit',
                unitValue: stagingProd.unit_value ? Number(stagingProd.unit_value) : undefined,
                brand: stagingProd.brand || 'Generic Brand',
                tags: stagingProd.tags_string ? stagingProd.tags_string.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length < 100) : [], // Add length checks
                imageUrl: (stagingProd.image_url && stagingProd.image_url.startsWith('http')) 
                            ? stagingProd.image_url 
                            : getSafePlaceholderImageUrl(stagingProd.name || stagingProd.sku),
                categoryId: stagingProd.category_id, // This is the UUID from categories table
                stock: Number.isFinite(stagingProd.stock) ? Number(stagingProd.stock) : 50,
                trackInventory: true,
                isActive: stagingProd.is_active !== undefined ? stagingProd.is_active : true,
                isFeatured: Math.random() < 0.05,
                isOnSale: isOnSale,
                salePercentage: salePercentage,
                nutritionalInfo: nutritionalInfo,
                metadata: { ...metadata, instacart_id: stagingProd.id_instacart }, // Add instacart_id to metadata
                avgRating: Math.round((Math.random() * 2 + 3) * 100) / 100, // Random rating 3-5
                reviewCount: Math.floor(Math.random() * 100),
            };

            try {
                if (existingProduct) {
                    await existingProduct.update(productData, { transaction });
                    updatedProductsCount++;
                } else {
                    await Product.create(
                        {
                            id: uuidv4(),
                            sku: stagingProd.sku,
                            ...productData,
                        } as Product,
                        { transaction }
                    );
                    newProductsCount++;
                }
            } catch (dbError: any) {
                 logger.error(`Failed to upsert product SKU ${stagingProd.sku}: ${dbError.message}`, {data: productData, error: dbError});
                 skippedMissingSku++; // Or a different counter for DB errors
            }
        }

        await transaction.commit();
        logger.info(`Product sync completed. New: ${newProductsCount}, Updated: ${updatedProductsCount}, Skipped (Bad Category/SKU): ${skippedInvalidCategory + skippedMissingSku}`);

    } catch (error) {
        if (transaction && !transaction.finished) { // Check if transaction exists and is not finished
            await transaction.rollback();
        }
        logger.error('Fatal error during product sync from staging:', error);
        throw error; // Re-throw to indicate failure to the calling process (Docker service)
    }
}

if (require.main === module) {
    sequelize.authenticate()
        .then(() => {
            logger.info('Database connection established for product sync job.');
            return syncProductsFromStaging();
        })
        .then(() => {
            logger.info('Product sync script finished successfully.');
            process.exit(0); // Success
        })
        .catch((err) => {
            logger.error('Product sync script failed:', err);
            process.exit(1); // Failure
        });
}

export default syncProductsFromStaging;