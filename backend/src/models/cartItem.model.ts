// backend/src/models/cartItem.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Cart } from './cart.model';
import { Product } from './product.model';

@Table({
  tableName: 'cart_items',
  timestamps: true
})
export class CartItem extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => Cart)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  cartId!: string;

  // Association defined in database.config.ts
  cart!: Cart;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  productId!: string;

  // Association defined in database.config.ts
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
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  price!: number; // Price at the time of adding to cart

  get total(): number {
    return this.price * this.quantity;
  }
}