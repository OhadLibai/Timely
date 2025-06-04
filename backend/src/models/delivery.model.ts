// backend/src/models/delivery.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Order } from './order.model';

export enum DeliveryType {
  STANDARD = 'standard',
  EXPRESS = 'express',
  SCHEDULED = 'scheduled'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}

@Table({
  tableName: 'deliveries',
  timestamps: true
})
export class Delivery extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => Order)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true
  })
  orderId!: string;

  @BelongsTo(() => Order)
  order!: Order;

  @Column({
    type: DataType.ENUM(...Object.values(DeliveryType)),
    defaultValue: DeliveryType.STANDARD
  })
  type!: DeliveryType;

  @Column({
    type: DataType.ENUM(...Object.values(DeliveryStatus)),
    defaultValue: DeliveryStatus.PENDING
  })
  status!: DeliveryStatus;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  addressLine1!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  addressLine2?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  city!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  state!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  zipCode!: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'USA'
  })
  country!: string;

  @Column({
    type: DataType.DATEONLY, // Stores only date
    allowNull: true
  })
  scheduledDate?: string;

  @Column({
    type: DataType.TIME, // Stores only time HH:MM:SS
    allowNull: true
  })
  scheduledTimeStart?: string;

  @Column({
    type: DataType.TIME, // Stores only time HH:MM:SS
    allowNull: true
  })
  scheduledTimeEnd?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  deliveredAt?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  deliveryNotes?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  trackingNumber?: string;
}