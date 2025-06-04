// backend/src/models/productView.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Product } from './product.model';

@Table({
  tableName: 'product_views',
  timestamps: true,
  updatedAt: false, // No updatedAt for view logs typically
  createdAt: 'viewed_at' // Use viewed_at as the creation timestamp
})
export class ProductView extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true // Allow anonymous views
  })
  userId?: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  productId!: string;

  @BelongsTo(() => Product)
  product!: Product;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  sessionId?: string; // For anonymous users

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  viewed_at!: Date;
}