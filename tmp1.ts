private async generateNewBasket(userId: string, weekOf: Date): Promise<PredictedBasket> {
    try {
      // Get predictions from ML service
      const response = await mlApiClient.post('/predict/next-basket', {
        user_id: userId,
        n_recommendations: 30
      });

      const predictions = response.data.predictions;

      // Create basket
      const basket = await PredictedBasket.create({
        userId,
        weekOf,
        status: 'generated',
        confidenceScore: response.data.confidence || 0.75
      });

      // Create basket items
      const items = await Promise.all(
        predictions.map(async (pred: any) => {
          const product = await Product.findByPk(pred.product_id);
          if (!product || !product.isActive) return null;

          return PredictedBasketItem.create({
            basketId: basket.id,
            productId: pred.product_id,
            quantity: pred.quantity || 1,
            confidenceScore: pred.confidence || 0.5,
            isAccepted: true
          });
        })
      );

      // Filter out null items
      const validItems = items.filter(item => item !== null);

      // Get full basket with items
      const fullBasket = await PredictedBasket.findByPk(basket.id, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          }
        ]
      });

      logger.info(`Generated predicted basket ${basket.id} for user ${userId} with ${validItems.length} items`);

      return fullBasket!;
    } catch (mlError) {
      logger.error('ML service error, using fallback prediction', mlError);
      
      // Fallback: Get user's most frequently purchased items
      const frequentProducts = await OrderItem.findAll({
        attributes: [
          'productId',
          [OrderItem.sequelize!.fn('COUNT', OrderItem.sequelize!.col('productId')), 'count'],
          [OrderItem.sequelize!.fn('AVG', OrderItem.sequelize!.col('quantity')), 'avgQuantity']
        ],
        include: [
          {
            model: Order,
            as: 'order',
            where: { userId },
            attributes: []
          }
        ],
        group: ['productId'],
        order: [[OrderItem.sequelize!.fn('COUNT', OrderItem.sequelize!.col('productId')), 'DESC']],
        limit: 20,
        raw: true
      });

      // Create basket
      const basket = await PredictedBasket.create({
        userId,
        weekOf,
        status: 'generated',
        confidenceScore: 0.6
      });

      // Create items from frequent products
      await Promise.all(
        frequentProducts.map(async (item: any) => {
          const product = await Product.findByPk(item.productId);
          if (!product || !product.isActive) return;

          return PredictedBasketItem.create({
            basketId: basket.id,
            productId: item.productId,
            quantity: Math.ceil(item.avgQuantity),
            confidenceScore: Math.min(item.count / 10, 0.9),
            isAccepted: true
          });
        })
      );

      // Get full basket
      const fullBasket = await PredictedBasket.findByPk(basket.id, {
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          }
        ]
      });

      return fullBasket!;
    }
  }