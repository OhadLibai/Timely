// backend/src/models/predictedBasketItem.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PredictedBasket } from '@/models/predictedBasket.model';
import { Product } from '@/models/product.model';

@Table({
  tableName: 'predicted_basket_items',
  timestamps: true
})
export class PredictedBasketItem extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => PredictedBasket)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  basketId!: string;

  @BelongsTo(() => PredictedBasket, 'basketId')
  basket!: PredictedBasket;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  productId!: string;

  @BelongsTo(() => Product)
  product!: Product;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 1
    }
  })
  confidenceScore?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isAccepted!: boolean;
}