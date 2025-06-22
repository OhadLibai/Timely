// backend/src/models/predictedBasket.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from '@/models/user.model';
import { PredictedBasketItem } from '@/models/predictedBasketItem.model';

export enum PredictedBasketStatus {
  GENERATED = 'generated',
  MODIFIED = 'modified',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

@Table({
  tableName: 'predicted_baskets',
  timestamps: true
})
export class PredictedBasket extends Model {
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
    type: DataType.DATEONLY, // Stores only the date part
    allowNull: false
  })
  weekOf!: string; // Should be the start date of the week, e.g., 'YYYY-MM-DD'

  @Column({
    type: DataType.ENUM(...Object.values(PredictedBasketStatus)),
    defaultValue: PredictedBasketStatus.GENERATED
  })
  status!: PredictedBasketStatus;

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
    type: DataType.DATE,
    allowNull: true
  })
  acceptedAt?: Date;

  @HasMany(() => PredictedBasketItem, 'basketId')
  items!: PredictedBasketItem[];
}