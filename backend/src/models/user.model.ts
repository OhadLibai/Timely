// backend/src/models/user.model.ts
// ACTUAL FIX: Sequelize model matching database schema exactly

import { Table, Column, Model, DataType, BeforeCreate, BeforeUpdate } from 'sequelize-typescript';
import bcrypt from 'bcryptjs';

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

  // CRITICAL FIX: Added missing fields from database schema
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  emailVerified!: boolean;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  dateOfBirth?: Date;

  // Auth/Security fields
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