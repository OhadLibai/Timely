// backend/src/models/user.model.ts - CRITICAL: Ensure metadata field exists
import { 
  Table, Column, Model, DataType, HasMany, HasOne, 
  BeforeCreate, BeforeUpdate, DefaultScope, Scopes 
} from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import { Order } from './order.model';
import { Cart } from './cart.model';
import { Favorite } from './favorite.model';
import { PredictedBasket } from './predictedBasket.model';
import { UserPreference } from './userPreference.model';
import { ProductView } from './productView.model';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

@DefaultScope(() => ({
  attributes: { exclude: ['password'] }
}))
@Scopes(() => ({
  withPassword: {
    attributes: { include: ['password'] }
  },
  active: {
    where: { isActive: true }
  }
}))
@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true
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
    unique: true,
    allowNull: false,
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
    allowNull: true
  })
  firstName?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  lastName?: string;

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
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  emailVerified!: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  phone?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  dateOfBirth?: Date;

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

  // CRITICAL: Metadata field for storing instacart_user_id and other data
  @Column({
    type: DataType.JSONB,
    defaultValue: {},
    allowNull: false
  })
  metadata!: {
    instacart_user_id?: string;
    source?: string;
    seeded_at?: string;
    [key: string]: any;
  };

  // Associations
  @HasMany(() => Order)
  orders!: Order[];

  @HasOne(() => Cart)
  cart!: Cart;

  @HasMany(() => Favorite)
  favorites!: Favorite[];

  @HasMany(() => PredictedBasket)
  predictedBaskets!: PredictedBasket[];

  @HasOne(() => UserPreference)
  preferences!: UserPreference;

  @HasMany(() => ProductView)
  productViews!: ProductView[];

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(user.password, salt);
    }
  }

  // Instance methods
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  // Helper method to get Instacart user ID
  getInstacartUserId(): string | null {
    return this.metadata?.instacart_user_id || null;
  }

  // Helper method to check if user is a demo user
  isDemoUser(): boolean {
    return !!this.metadata?.instacart_user_id && 
           this.metadata?.source === 'instacart_dataset';
  }

  // Update last login
  async updateLastLogin(): Promise<void> {
    this.lastLoginAt = new Date();
    await this.save();
  }

  // JSON representation
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.resetPasswordToken;
    return values;
  }
}