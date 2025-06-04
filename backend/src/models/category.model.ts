// backend/src/models/category.model.ts
import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Product } from './product.model';

@Table({
  tableName: 'categories',
  timestamps: true
})
export class Category extends Model {
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
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  imageUrl?: string;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  parentId?: string;

  @BelongsTo(() => Category, 'parentId')
  parentCategory?: Category;

  @HasMany(() => Category, 'parentId')
  subCategories?: Category[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @HasMany(() => Product)
  products!: Product[];
}