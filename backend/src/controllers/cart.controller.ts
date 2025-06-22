// backend/src/controllers/cart.controller.ts

import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Cart, CartItem, Product, Category, User } from '@/models';
import logger from '@/utils/logger';

// Define a more specific type for populated cart items for better type safety
interface CartItemWithProduct extends CartItem {
  product: Product;
}

export class CartController {
  // Get current cart
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      let cart = await Cart.findOne({
        where: { userId, isActive: true },
        include: [
          {
            model: CartItem,
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

      if (!cart) {
        // Create new cart if doesn't exist
        cart = await Cart.create({ userId });
        // Fetch it again to ensure associations are loaded correctly
        cart = await Cart.findByPk(cart.id, {
          include: [
            {
              model: CartItem,
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
      }

      // Calculate totals
      const cartData = this.calculateCartTotals(cart!);

      res.json(cartData);
    } catch (error) {
      next(error);
    }
  }

  // Add item to cart
  async addToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { productId, quantity } = req.body;

      // Get user's cart
      let cart = await Cart.findOne({ where: { userId, isActive: true } });
      if (!cart) {
        cart = await Cart.create({ userId });
      }

      // Check if product exists and is active
      const product = await Product.findByPk(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check stock
      if (product.trackInventory && product.stock < quantity) {
        return res.status(400).json({ 
          error: 'Insufficient stock', 
          available: product.stock 
        });
      }

      // Check if item already in cart
      let cartItem = await CartItem.findOne({
        where: { cartId: cart.id, productId }
      });

      if (cartItem) {
        // Update quantity
        const newQuantity = cartItem.quantity + quantity;
        
        // Check stock for new quantity
        if (product.trackInventory && product.stock < newQuantity) {
          return res.status(400).json({ 
            error: 'Insufficient stock for requested quantity', 
            available: product.stock 
          });
        }

        await cartItem.update({ 
          quantity: newQuantity,
          price: product.salePrice
        });
      } else {
        // Create new cart item
        cartItem = await CartItem.create({
          cartId: cart.id,
          productId,
          quantity,
          price: product.salePrice
        });
      }

      // Get updated cart
      const updatedCart = await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
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

      const cartData = this.calculateCartTotals(updatedCart!);

      logger.info(`Product ${productId} added to cart for user ${userId}`);

      res.json(cartData);
    } catch (error) {
      next(error);
    }
  }

  // Update cart item quantity
  async updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      const cartItem = await CartItem.findByPk(itemId, {
        include: [
          {
            model: Cart,
            as: 'cart',
            where: { userId, isActive: true }
          },
          {
            model: Product,
            as: 'product'
          }
        ]
      }) as (CartItem & { product: Product }); // Cast to ensure product is available

      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      // Check stock
      if (cartItem.product.trackInventory && cartItem.product.stock < quantity) {
        return res.status(400).json({ 
          error: 'Insufficient stock', 
          available: cartItem.product.stock 
        });
      }

      // Update quantity and price (in case product price changed)
      await cartItem.update({ 
        quantity,
        price: cartItem.product.salePrice
      });

      // Get updated cart
      const cart = await Cart.findByPk(cartItem.cartId, {
        include: [
          {
            model: CartItem,
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

      const cartData = this.calculateCartTotals(cart!);

      res.json(cartData);
    } catch (error) {
      next(error);
    }
  }

  // Remove item from cart
  async removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { itemId } = req.params;

      const cartItem = await CartItem.findByPk(itemId, {
        include: [
          {
            model: Cart,
            as: 'cart',
            where: { userId, isActive: true }
          }
        ]
      });

      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      await cartItem.destroy();

      // Get updated cart
      const cart = await Cart.findByPk(cartItem.cartId, {
        include: [
          {
            model: CartItem,
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

      const cartData = this.calculateCartTotals(cart!);

      res.json(cartData);
    } catch (error) {
      next(error);
    }
  }

  // Clear entire cart
  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const cart = await Cart.findOne({ where: { userId, isActive: true } });
      if (!cart) {
        return res.json(this.getEmptyCart());
      }

      await CartItem.destroy({ where: { cartId: cart.id } });

      res.json(this.getEmptyCart());
    } catch (error) {
      next(error);
    }
  }

  // Sync with predicted basket
  async syncWithPredictedBasket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { basketId } = req.params;

      // Get predicted basket
      const predictedBasket = await PredictedBasket.findOne({
        where: { id: basketId, userId },
        include: [
          {
            model: PredictedBasketItem,
            as: 'items',
            where: { isAccepted: true },
            include: [
              {
                model: Product,
                as: 'product'
              }
            ]
          }
        ]
      }) as (PredictedBasket & { items: (PredictedBasketItem & { product: Product })[] }); // Cast for type safety

      if (!predictedBasket) {
        return res.status(404).json({ error: 'Predicted basket not found' });
      }

      // Get or create cart
      let cart = await Cart.findOne({ where: { userId, isActive: true } });
      if (!cart) {
        cart = await Cart.create({ userId });
      }

      // Add predicted items to cart
      for (const item of predictedBasket.items) {
        // Check if product is still available
        if (!item.product.isActive || (item.product.trackInventory && item.product.stock < item.quantity)) {
          continue;
        }

        // Check if already in cart
        const existingItem = await CartItem.findOne({
          where: { cartId: cart.id, productId: item.productId }
        });

        if (existingItem) {
          await existingItem.update({
            quantity: existingItem.quantity + item.quantity,
            price: item.product.salePrice
          });
        } else {
          await CartItem.create({
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.salePrice
          });
        }
      }

      // Update predicted basket status
      await predictedBasket.update({ status: 'accepted' });

      // Get updated cart
      const updatedCart = await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
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

      const cartData = this.calculateCartTotals(updatedCart!);

      res.json(cartData);
    } catch (error) {
      next(error);
    }
  }

  // Validate cart stock
  async validateCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const cart = await Cart.findOne({
        where: { userId, isActive: true },
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product'
              }
            ]
          }
        ]
      }) as (Cart & { items: CartItemWithProduct[] });

      if (!cart || cart.items.length === 0) {
        return res.json({ valid: true, invalidItems: [] });
      }

      const invalidItems: string[] = [];

      for (const item of cart.items) {
        // Check if product is still active
        if (!item.product.isActive) {
          invalidItems.push(item.id);
          continue;
        }

        // Check stock
        if (item.product.trackInventory && item.product.stock < item.quantity) {
          invalidItems.push(item.id);
        }
      }

      res.json({
        valid: invalidItems.length === 0,
        invalidItems
      });
    } catch (error) {
      next(error);
    }
  }

  // Merge guest cart after login
  async mergeGuestCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { items } = req.body; // Assuming items: {productId: string, quantity: number}[]

      // Get or create user cart
      let cart = await Cart.findOne({ where: { userId, isActive: true } });
      if (!cart) {
        cart = await Cart.create({ userId });
      }

      // Add guest items to cart
      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product || !product.isActive) continue;

        const existingItem = await CartItem.findOne({
          where: { cartId: cart.id, productId: item.productId }
        });

        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          if (!product.trackInventory || product.stock >= newQuantity) {
            await existingItem.update({
              quantity: newQuantity,
              price: product.salePrice
            });
          }
        } else {
          if (!product.trackInventory || product.stock >= item.quantity) {
            await CartItem.create({
              cartId: cart.id,
              productId: item.productId,
              quantity: item.quantity,
              price: product.salePrice
            });
          }
        }
      }

      // Get updated cart
      const updatedCart = await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
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

      const cartData = this.calculateCartTotals(updatedCart!);

      res.json(cartData);
    } catch (error) {
      next(error);
    }
  }

  // Get cart count
  async getCartCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const cart = await Cart.findOne({
        where: { userId, isActive: true },
        include: [
          {
            model: CartItem,
            as: 'items',
            attributes: ['quantity']
          }
        ]
      });

      const count = cart?.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) || 0;

      res.json({ count });
    } catch (error) {
      next(error);
    }
  }

  // FIXED: Implement move to cart functionality
  async moveToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { savedItemId } = req.params;

      // Find the saved item
      const savedItem = await CartItem.findOne({
        where: { id: savedItemId },
        include: [{
          model: Cart,
          where: { userId, cartType: 'saved', isActive: true }
        }]
      });

      if (!savedItem) {
        return res.status(404).json({ error: 'Saved item not found' });
      }

      // Get or create active cart
      let activeCart = await Cart.findOne({
        where: { userId, cartType: 'shopping', isActive: true }
      });

      if (!activeCart) {
        activeCart = await Cart.create({
          userId,
          cartType: 'shopping',
          isActive: true
        });
      }

      // Check if item already exists in cart
      const existingCartItem = await CartItem.findOne({
        where: {
          cartId: activeCart.id,
          productId: savedItem.productId
        }
      });

      if (existingCartItem) {
        // Update quantity
        await existingCartItem.update({
          quantity: existingCartItem.quantity + savedItem.quantity
        });
      } else {
        // Create new cart item
        await CartItem.create({
          cartId: activeCart.id,
          productId: savedItem.productId,
          quantity: savedItem.quantity,
          price: savedItem.price
        });
      }

      // Remove from saved items
      await savedItem.destroy();

      logger.info(`Saved item moved to cart for user ${userId}`);

      res.json({
        message: 'Item moved to cart successfully'
      });

    } catch (error) {
      logger.error('Error moving item to cart:', error);
      next(error);
    }
  }

  // Estimate shipping
  async estimateShipping(req: Request, res: Response, next: NextFunction) {
    try {
      const { zipCode, country = 'USA' } = req.body;
      const userId = (req as any).user.id;

      const cart = await Cart.findOne({
        where: { userId, isActive: true },
        include: [
          {
            model: CartItem,
            as: 'items'
          }
        ]
      });

      if (!cart || cart.items.length === 0) {
        return res.json({ 
          standard: 0,
          express: 0,
          scheduled: 0
        });
      }

      const subtotal = cart.items.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);

      // Simple shipping calculation
      const rates = {
        standard: subtotal >= 50 ? 0 : 4.99,
        express: 12.99,
        scheduled: 7.99
      };

      res.json(rates);
    } catch (error) {
      next(error);
    }
  }

  // Get cart recommendations - FIXED: Removed ML call, using fallback logic as primary
  async getCartRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { limit = 4 } = req.query;

      // Get cart items
      const cart = await Cart.findOne({
        where: { userId, isActive: true },
        include: [
          {
            model: CartItem,
            as: 'items',
            attributes: ['productId']
          }
        ]
      });

      if (!cart || cart.items.length === 0) {
        // Return popular products when cart is empty
        const popularProducts = await Product.findAll({
          where: { isActive: true },
          order: [['purchaseCount', 'DESC']],
          limit: parseInt(limit as string),
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            }
          ]
        });

        return res.json(popularProducts);
      }

      // Get categories of items currently in cart
      const categoriesInCart = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id']
              }
            ]
          }
        ],
        attributes: []
      });

      const categoryIds = categoriesInCart
        .map((item: any) => item.product?.category?.id)
        .filter(Boolean);

      const uniqueCategoryIds = [...new Set(categoryIds)];

      if (uniqueCategoryIds.length === 0) {
        // Fallback to popular products
        const popularProducts = await Product.findAll({
          where: { isActive: true },
          order: [['purchaseCount', 'DESC']],
          limit: parseInt(limit as string),
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            }
          ]
        });

        return res.json(popularProducts);
      }

      // Get products from the same categories, excluding items already in cart
      const cartProductIds = cart.items.map((item: CartItem) => item.productId);
      
      const recommendations = await Product.findAll({
        where: {
          categoryId: { [Op.in]: uniqueCategoryIds },
          id: { [Op.notIn]: cartProductIds },
          isActive: true
        },
        order: [['purchaseCount', 'DESC']],
        limit: parseInt(limit as string),
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ]
      });

      logger.info(`Generated ${recommendations.length} cart recommendations for user ${userId}`);
      res.json(recommendations);

    } catch (error) {
      logger.error('Error getting cart recommendations:', error);
      next(error);
    }
  }

  // Helper methods
  private calculateCartTotals(cart: Cart & { items?: CartItemWithProduct[] }) {
    const items = cart.items || [];
    
    const itemCount = items.reduce((sum: number, item: CartItemWithProduct) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum: number, item: CartItemWithProduct) => sum + (item.price * item.quantity), 0);
    const estimatedTax = subtotal * 0.08; // 8% tax
    const estimatedTotal = subtotal + estimatedTax;

    return {
      id: cart.id,
      userId: cart.userId,
      items: items.map((item: CartItemWithProduct) => ({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      itemCount,
      subtotal,
      estimatedTax,
      estimatedTotal,
      isActive: cart.isActive,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt
    };
  }

  private getEmptyCart() {
    return {
      id: '',
      userId: '',
      items: [],
      itemCount: 0,
      subtotal: 0,
      estimatedTax: 0,
      estimatedTotal: 0,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

}