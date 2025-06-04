// backend/src/config/database.ts
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
  // User associations
  User.hasOne(Cart, { foreignKey: 'userId', as: 'cart' });
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
  User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
  User.hasMany(PredictedBasket, { foreignKey: 'userId', as: 'predictedBaskets' });
  User.hasOne(UserPreference, { foreignKey: 'userId', as: 'preferences' });
  User.hasMany(ProductView, { foreignKey: 'userId', as: 'productViews' });

  // Product associations
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems' });
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  Product.hasMany(Favorite, { foreignKey: 'productId', as: 'favorites' });
  Product.hasMany(PredictedBasketItem, { foreignKey: 'productId', as: 'predictedItems' });
  Product.hasMany(ProductView, { foreignKey: 'productId', as: 'views' });

  // Category associations
  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
  Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parentCategory' }); // Self-referencing for parent category
  Category.hasMany(Category, { foreignKey: 'parentId', as: 'subCategories' });   // Self-referencing for subcategories

  // Cart associations
  Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });

  // CartItem associations
  CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });
  CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Order associations
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  Order.hasOne(Delivery, { foreignKey: 'orderId', as: 'delivery' });

  // OrderItem associations
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Favorite associations
  Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Favorite.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // PredictedBasket associations
  PredictedBasket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  PredictedBasket.hasMany(PredictedBasketItem, { foreignKey: 'basketId', as: 'items' });

  // PredictedBasketItem associations
  PredictedBasketItem.belongsTo(PredictedBasket, { foreignKey: 'basketId', as: 'basket' });
  PredictedBasketItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // UserPreference associations
  UserPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Delivery associations
  Delivery.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  // ProductView associations
  ProductView.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  ProductView.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // ModelMetric has no direct associations with other business models in this context
};

// Initialize associations
defineAssociations();