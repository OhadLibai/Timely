// backend/src/config/database.config.ts
import { Sequelize } from 'sequelize-typescript';
import path from 'path';
import logger from '../utils/logger';

// Import all models
import { User } from '../models/user.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Cart } from '../models/cart.model';
import { CartItem } from '../models/cartItem.model';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/orderItem.model';
import { Favorite } from '../models/favorite.model';
import { PredictedBasket } from '../models/predictedBasket.model';
import { PredictedBasketItem } from '../models/predictedBasketItem.model';
import { UserPreference } from '../models/userPreference.model';
import { Delivery } from '../models/delivery.model';
import { ProductView } from '../models/productView.model';
import { ModelMetric } from '../models/modelMetric.model';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://timely_user:timely_password@localhost:5432/timely_db';

export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg), // Pass logger's debug method directly
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    // Convert camelCase model attributes to snake_case column names
    underscored: true,
    // Convert snake_case column names to camelCase model attributes when reading
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  models: [
    User,
    Product,
    Category,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Favorite,
    PredictedBasket,
    PredictedBasketItem,
    UserPreference,
    Delivery,
    ProductView,
    ModelMetric
  ]
});

// Define associations
export const defineAssociations = () => {
  // All associations are defined using decorators in the model files
  // This function is kept for future manual associations if needed
};

// Initialize associations
defineAssociations();