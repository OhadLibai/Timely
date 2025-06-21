// backend/src/models/order.model.ts
// UPDATED WITH TEMPORAL FIELDS FOR ML COMPATIBILITY

import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, HasOne } from 'sequelize-typescript';
import { User } from './user.model';
import { OrderItem } from './orderItem.model';
import { Delivery } from './delivery.model';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Table({
  tableName: 'orders',
  timestamps: true
})
export class Order extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  orderNumber!: string;

  // CRITICAL: Temporal fields required by ML model (trained on Instacart data)
  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  })
  daysSincePriorOrder!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  orderDow!: number; // Day of week: 0=Monday, 6=Sunday

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  orderHourOfDay!: number; // Hour of day: 0-23

  @Column({
    type: DataType.ENUM(...Object.values(OrderStatus)),
    defaultValue: OrderStatus.PENDING
  })
  status!: OrderStatus;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  tax!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  deliveryFee!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  discount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  total!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  paymentMethod?: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    defaultValue: PaymentStatus.PENDING
  })
  paymentStatus!: PaymentStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes?: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: {}
  })
  metadata!: Record<string, any>;

  @HasMany(() => OrderItem)
  orderItems!: OrderItem[];

  @HasOne(() => Delivery)
  delivery?: Delivery;
}

// Helper function to calculate temporal fields for order creation
export class OrderTemporalCalculator {
  /**
   * Calculate temporal fields for new order
   */
  static async calculateTemporalFields(userId: string): Promise<{
    daysSincePriorOrder: number;
    orderDow: number;
    orderHourOfDay: number;
  }> {
    const now = new Date();
    
    // Calculate day of week (0=Monday, 6=Sunday) to match Instacart format
    const orderDow = now.getDay() === 0 ? 6 : now.getDay() - 1; // Convert Sunday=0 to Sunday=6
    
    // Calculate hour of day
    const orderHourOfDay = now.getHours();
    
    // Find user's most recent order to calculate days_since_prior_order
    const lastOrder = await Order.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    let daysSincePriorOrder = 0;
    if (lastOrder) {
      const timeDiff = now.getTime() - lastOrder.createdAt.getTime();
      daysSincePriorOrder = Math.round(timeDiff / (1000 * 60 * 60 * 24));
    }
    
    return {
      daysSincePriorOrder,
      orderDow,
      orderHourOfDay
    };
  }
}