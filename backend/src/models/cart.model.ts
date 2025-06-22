// backend/src/models/cart.model.ts
import { Table, Column, Model, DataType, BelongsTo, HasMany, ForeignKey } from 'sequelize-typescript';
import { User } from '@/models/user.model';
import { CartItem } from '@/models/cartItem.model';

@Table({
  tableName: 'carts',
  timestamps: true
})
export class Cart extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true
  })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => CartItem)
  items!: CartItem[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  // Calculated properties (not stored in DB, but useful)
  get itemCount(): number {
    return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  get subtotal(): number {
    return this.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  }
}