// backend/src/models/product.model.ts
import { Table, Column, Model, DataType, BelongsTo, HasMany, ForeignKey } from 'sequelize-typescript';
import { Category } from './category.model';
import { CartItem } from './cartItem.model';
import { OrderItem } from './orderItem.model';
import { Favorite } from './favorite.model';
import { PredictedBasketItem } from './predictedBasketItem.model';
import { ProductView } from './productView.model';

@Table({
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['sku'],
      unique: true
    },
    {
      fields: ['categoryId']
    },
    {
      fields: ['price']
    },
    {
      fields: ['isActive']
    }
  ]
})
export class Product extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  sku!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  })
  compareAtPrice?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  unit?: string;

  @Column({
    type: DataType.DECIMAL(10, 3),
    allowNull: true
  })
  unitValue?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  brand?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  tags!: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  imageUrl?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  additionalImages!: string[];

  @ForeignKey(() => Category)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  categoryId!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  })
  stock!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  trackInventory!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isFeatured!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isOnSale!: boolean;

  @Column({
    type: DataType.DECIMAL(5, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  })
  salePercentage!: number;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  nutritionalInfo!: Record<string, any>;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: Record<string, any>;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  viewCount!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  purchaseCount!: number;

  @Column({
    type: DataType.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  })
  avgRating!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  reviewCount!: number;

  // Associations
  @BelongsTo(() => Category)
  category!: Category;

  @HasMany(() => CartItem)
  cartItems!: CartItem[];

  @HasMany(() => OrderItem)
  orderItems!: OrderItem[];

  @HasMany(() => Favorite)
  favorites!: Favorite[];

  @HasMany(() => PredictedBasketItem)
  predictedItems!: PredictedBasketItem[];

  @HasMany(() => ProductView)
  views!: ProductView[];

  // Computed properties
  get salePrice(): number {
    if (this.isOnSale && this.salePercentage > 0) {
      return Number((this.price * (1 - this.salePercentage / 100)).toFixed(2));
    }
    return this.price;
  }

  get inStock(): boolean {
    return !this.trackInventory || this.stock > 0;
  }

  // Instance methods
  async incrementViewCount(): Promise<void> {
    await this.increment('viewCount');
  }

  async incrementPurchaseCount(quantity: number = 1): Promise<void> {
    await this.increment('purchaseCount', { by: quantity });
  }

  async updateStock(quantity: number): Promise<void> {
    if (this.trackInventory) {
      await this.decrement('stock', { by: quantity });
    }
  }
}