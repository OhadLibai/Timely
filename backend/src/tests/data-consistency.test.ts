import { sequelize } from '../config/database';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';

describe('Data Consistency Checks', () => {
    it('should ensure SKUs in products table match staging and categories are valid', async () => {
        const [stagingProducts] = await sequelize.query(
            `SELECT sku, category_id FROM products_staging LIMIT 20`
        ) as [{ sku: string, category_id: string }[], any];

        expect(stagingProducts.length).toBeGreaterThan(0); // Ensure staging has data

        for (const stagingProd of stagingProducts) {
            const mainProduct = await Product.findOne({ where: { sku: stagingProd.sku } });
            expect(mainProduct).not.toBeNull(); // Product with this SKU must exist in main table
            expect(mainProduct?.sku).toBe(stagingProd.sku);

            const category = await Category.findByPk(stagingProd.category_id);
            expect(category).not.toBeNull(); // Category ID from staging must be valid
        }
    }, 60000); // Increase timeout if DB queries are slow
});