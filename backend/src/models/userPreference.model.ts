// backend/src/models/userPreference.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'user_preferences',
  timestamps: true
})
export class UserPreference extends Model {
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

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  autoBasketEnabled!: boolean;

  @Column({
    type: DataType.INTEGER, // 0 (Sunday) to 6 (Saturday)
    defaultValue: 0,
    validate: {
      min: 0,
      max: 6
    }
  })
  autoBasketDay!: number;

  @Column({
    type: DataType.TIME, // HH:MM:SS
    defaultValue: '10:00:00'
  })
  autoBasketTime!: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'standard'
  })
  deliveryPreference!: string; // e.g., 'standard', 'express', 'scheduled'

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    defaultValue: []
  })
  dietaryRestrictions!: string[];

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    defaultValue: []
  })
  preferredBrands!: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  notificationsEnabled!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  emailNotifications!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  smsNotifications!: boolean;

  @Column({
    type: DataType.STRING,
    defaultValue: 'en'
  })
  language!: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'USD'
  })
  currency!: string;

  // Adding metadata field based on init.sql. It was missing in the original prompt for userPreference.model
   @Column({
    type: DataType.JSONB,
    defaultValue: {}
  })
  metadata!: Record<string, any>;
}