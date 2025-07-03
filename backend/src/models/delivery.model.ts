// backend/src/models/delivery.model.ts
import { DataType, Column, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Order } from '@/models/order.model';

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
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
    allowNull: false
  })
  orderId!: string;

  @BelongsTo(() => Order)
  order!: Order;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  address!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  city!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  state!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  zipCode!: string;

  @Column({
    type: DataType.ENUM(...Object.values(DeliveryStatus)),
    defaultValue: DeliveryStatus.PENDING
  })
  status!: DeliveryStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  scheduledAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  deliveredAt!: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  updatedAt!: Date;
}
