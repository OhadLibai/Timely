// backend/src/config/database.ts
import { Sequelize } from 'sequelize-typescript';
import { User } from '@/models/user.model';
import { Product } from '@/models/product.model';
import { Category } from '@/models/category.model';
import { Cart } from '@/models/cart.model';
import { CartItem } from '@/models/cartItem.model';
import { Order } from '@/models/order.model';
import { OrderItem } from '@/models/orderItem.model';
import { Delivery } from '@/models/delivery.model';
import { Favorite } from '@/models/favorite.model';
import { UserPreference } from '@/models/userPreference.model';
import { ProductView } from '@/models/productView.model';
import { PredictedBasket } from '@/models/predictedBasket.model';
import { PredictedBasketItem } from '@/models/predictedBasketItem.model';
import { ModelMetric } from '@/models/modelMetric.model';

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  models: [
    User,
    Product,
    Category,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Delivery,
    Favorite,
    UserPreference,
    ProductView,
    PredictedBasket,
    PredictedBasketItem,
    ModelMetric
  ],
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

export { sequelize };
