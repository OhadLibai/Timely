// backend/src/models/user.model.ts
import { Table, Column, Model, DataType, HasOne, HasMany, BeforeCreate, BeforeUpdate } from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import { Cart } from '@/models/cart.model';
import { Order } from '@/models/order.model';
import { Favorite } from '@/models/favorite.model';
import { PredictedBasket } from '@/models/predictedBasket.model';
import { UserPreference } from '@/models/userPreference.model';
import { ProductView } from '@/models/productView.model';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

@Table({
  tableName: 'users',
  timestamps: true
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  firstName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  lastName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  phone?: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.USER
  })
  role!: UserRole;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  lastLoginAt?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  resetPasswordToken?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  resetPasswordExpires?: Date;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: Record<string, any>;

  // Associations are defined in database.config.ts
  cart!: Cart;
  orders!: Order[];
  favorites!: Favorite[];
  predictedBaskets!: PredictedBasket[];

  preferences!: UserPreference;

  productViews!: ProductView[];

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }

  // Instance methods
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.resetPasswordToken;
    delete values.resetPasswordExpires;
    return values;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}