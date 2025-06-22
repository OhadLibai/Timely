// backend/src/controllers/order.controller.ts
// UPDATED TO CALCULATE TEMPORAL FIELDS FOR ML COMPATIBILITY

import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Order, OrderStatus, PaymentStatus, OrderTemporalCalculator } from '../models/order.model';
import { OrderItem } from '../models/orderItem.model';
import { Product } from '../models/product.model';
import { User } from '../models/user.model';
import { Cart } from '../models/cart.model';
import { CartItem } from '../models/cartItem.model';
import { Delivery } from '../models/delivery.model';
import logger from '../utils/logger';

export class OrderController {
  
  // Create order with temporal field calculation
  async createOrder(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { cartId, paymentMethod, deliveryAddress, notes } = req.body;

    try {
      logger.info(`Creating order for user ${userId}`);

      // Get user's cart and items
      const cart = await Cart.findOne({
        where: { id: cartId, userId },
        include: [{
          model: CartItem,
          include: [{ model: Product }]
        }]
      });

      if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty or not found' });
      }

      // Calculate temporal fields - CRITICAL FOR ML MODEL
      const temporalFields = await OrderTemporalCalculator.calculateTemporalFields(userId);

      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate totals
      const subtotal = cart.cartItems.reduce((sum, item) => {
        const itemTotal = item.quantity * item.product.price;
        return sum + itemTotal;
      }, 0);

      const tax = subtotal * 0.0875; // 8.75% tax rate
      const deliveryFee = subtotal > 50 ? 0 : 5.99; // Free delivery over $50
      const total = subtotal + tax + deliveryFee;

      // Create order with temporal fields
      const order = await Order.create({
        userId,
        orderNumber,
        daysSincePriorOrder: temporalFields.daysSincePriorOrder,  // ✅ ML field
        orderDow: temporalFields.orderDow,                       // ✅ ML field  
        orderHourOfDay: temporalFields.orderHourOfDay,           // ✅ ML field
        status: OrderStatus.PENDING,
        subtotal,
        tax,
        deliveryFee,
        total,
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        notes
      });

      // Create order items
      const orderItems = await Promise.all(
        cart.cartItems.map(cartItem => 
          OrderItem.create({
            orderId: order.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.product.price,
            total: cartItem.quantity * cartItem.product.price
          })
        )
      );

      // Create delivery record if address provided
      if (deliveryAddress) {
        await Delivery.create({
          orderId: order.id,
          type: 'standard',
          status: 'pending',
          addressLine1: deliveryAddress.addressLine1,
          addressLine2: deliveryAddress.addressLine2,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          zipCode: deliveryAddress.zipCode,
          country: deliveryAddress.country || 'USA'
        });
      }

      // Clear the cart
      await CartItem.destroy({ where: { cartId } });
      await cart.update({ status: 'converted', total: 0 });

      // Fetch complete order with relations
      const completeOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: OrderItem,
            include: [{ model: Product }]
          },
          { model: Delivery },
          { model: User, attributes: ['id', 'email', 'firstName', 'lastName'] }
        ]
      });

      logger.info(`Order created successfully: ${order.orderNumber} with temporal fields: dow=${temporalFields.orderDow}, hour=${temporalFields.orderHourOfDay}, days_since_prior=${temporalFields.daysSincePriorOrder}`);

      res.status(201).json({
        message: 'Order created successfully',
        order: completeOrder
      });

    } catch (error) {
      logger.error(`Error creating order for user ${userId}:`, error);
      next(error);
    }
  }

  // Get user's order history
  async getUserOrders(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;

    try {
      const offset = (Number(page) - 1) * Number(limit);

      const orders = await Order.findAndCountAll({
        where: { userId },
        include: [
          {
            model: OrderItem,
            include: [{ model: Product, attributes: ['id', 'name', 'imageUrl', 'price'] }]
          },
          { model: Delivery, attributes: ['status', 'type', 'deliveredAt'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        orders: orders.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: orders.count,
          totalPages: Math.ceil(orders.count / Number(limit))
        }
      });

    } catch (error) {
      logger.error(`Error fetching orders for user ${userId}:`, error);
      next(error);
    }
  }

  // Get specific order details
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { orderId } = req.params;

    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [
          {
            model: OrderItem,
            include: [{ model: Product }]
          },
          { model: Delivery },
          { model: User, attributes: ['id', 'email', 'firstName', 'lastName'] }
        ]
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);

    } catch (error) {
      logger.error(`Error fetching order ${orderId}:`, error);
      next(error);
    }
  }

  // Update delivery preferences
  async updateDeliveryPreferences(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { orderId } = req.params;
    const { deliveryTime, deliveryInstructions, contactMethod } = req.body;

    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [Delivery]
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!['pending', 'confirmed'].includes(order.status)) {
        return res.status(400).json({ 
          error: 'Cannot update delivery preferences for orders in current status' 
        });
      }

      // Update delivery information
      if (order.delivery) {
        await order.delivery.update({
          scheduledDeliveryTime: deliveryTime,
          deliveryInstructions,
          contactMethod
        });
      }

      res.json({
        message: 'Delivery preferences updated successfully',
        order: await order.reload({ include: [Delivery] })
      });

    } catch (error) {
      logger.error(`Error updating delivery preferences for order ${orderId}:`, error);
      next(error);
    }
  }

  // Reorder items from previous order
  async reorderItems(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { orderId } = req.params;
    const { items, addToCart = true } = req.body;

    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [{ 
          model: OrderItem,
          include: [Product]
        }]
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get items to reorder (all items if none specified)
      const itemsToReorder = items || order.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      if (addToCart) {
        // Add items to user's cart
        // Implementation depends on your cart system
        // This is a placeholder
        res.json({
          message: 'Items added to cart successfully',
          items: itemsToReorder
        });
      } else {
        // Return items for manual addition
        res.json({
          message: 'Reorder items prepared',
          items: itemsToReorder
        });
      }

    } catch (error) {
      logger.error(`Error reordering items from order ${orderId}:`, error);
      next(error);
    }
  }

  // Add order to favorites
  async addOrderToFavorites(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;
    const { orderId } = req.params;
    const { name } = req.body;

    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [OrderItem]
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // This would typically save to a favorites table
      // Implementation depends on your favorites system
      res.json({
        message: 'Order added to favorites successfully',
        favoriteName: name || `Order ${order.orderNumber}`
      });

    } catch (error) {
      logger.error(`Error adding order ${orderId} to favorites:`, error);
      next(error);
    }
  }

  // Get order statistics
  async getOrderStats(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.id;

    try {
      const stats = await Order.findAndCountAll({
        where: { userId },
        attributes: [
          [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'totalOrders'],
          [Order.sequelize.fn('SUM', Order.sequelize.col('total')), 'totalSpent'],
          [Order.sequelize.fn('AVG', Order.sequelize.col('total')), 'averageOrderValue']
        ],
        raw: true
      });

      res.json(stats);

    } catch (error) {
      logger.error(`Error fetching order stats for user ${userId}:`, error);
      next(error);
    }
  }
}