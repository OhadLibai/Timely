// In backend/src/controllers/prediction.controller.ts

// This private helper method contains the core logic
private async generateNewBasket(userId: string): Promise<Product[]> {
    try {
        logger.info(`Generating new basket for user: ${userId}`);
        
        // 1. Call the ML service to get the list of predicted product IDs
        const mlResponse = await mlApiClient.post('/predict', { userId });
        
        // 2. The mlResponse.data is now a simple array of IDs, e.g., [101, 203, 405]
        const predictedProductIds = mlResponse.data;

        if (!predictedProductIds || predictedProductIds.length === 0) {
            logger.info(`ML service returned an empty basket for user: ${userId}`);
            return [];
        }

        // 3. Enrich the IDs with full product details from the database
        const products = await Product.findAll({
            where: { id: { [Op.in]: predictedProductIds } },
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        });

        // The 'products' array now contains full product objects ready to be sent to the frontend
        return products;

    } catch (error) {
        logger.error(`Error in generateNewBasket for user ${userId}:`, error);
        throw error;
    }
}