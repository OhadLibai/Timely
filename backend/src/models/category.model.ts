// backend/src/models/category.model.ts
// FIXED: Added slug field to match database schema

import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo, BeforeCreate, BeforeUpdate } from 'sequelize-typescript';
import { Product } from '@/models/product.model';

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

  // FIXED: Added slug field to match database schema
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  slug!: string;

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
    type: DataType.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  })
  sortOrder!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @HasMany(() => Product)
  products!: Product[];

  // Helper method to generate slug from name
  @BeforeCreate
  @BeforeUpdate
  static generateSlug(instance: Category) {
    if (!instance.slug && instance.name) {
      instance.slug = instance.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }
}

// ============================================================================
// ARCHITECTURE FIX COMPLETE:
// 
// ✅ FIXED SCHEMA MISMATCH:
// - Added slug field (VARCHAR(255) UNIQUE NOT NULL) to match database
// - Added sortOrder field mapping to sort_order column
// - Added automatic slug generation from name
// 
// ✅ MAINTAINED COMPATIBILITY:
// - All existing relationships preserved
// - All existing functionality maintained
// - Database schema now perfectly aligned
// 
// This fixes the critical schema mismatch that would have caused
// insertion/update failures when working with categories.
// ============================================================================