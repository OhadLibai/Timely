// backend/src/models/userPreference.model.ts
// SIMPLIFIED: Removed unused fields, kept only ML prediction-related preferences

import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/models/user.model';

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
    unique: true // One preference record per user
  })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  // ============================================================================
  // CORE ML PREDICTION PREFERENCES (Essential for Demands 1, 3, 4)
  // ============================================================================

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Enable automatic basket generation'
  })
  autoBasketEnabled!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0, // Sunday
    allowNull: false,
    validate: {
      min: 0,
      max: 6
    },
    comment: 'Day of week for auto basket generation (0=Sunday, 6=Saturday)'
  })
  autoBasketDay!: number;

  @Column({
    type: DataType.TIME,
    defaultValue: '10:00:00',
    allowNull: false,
    comment: 'Time of day for auto basket generation'
  })
  autoBasketTime!: string;

  // ============================================================================
  // BASIC UI PREFERENCES (Supporting Demand 4 - User Experience)
  // ============================================================================

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Enable email notifications for ML predictions'
  })
  emailNotifications!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Enable dark mode in UI'
  })
  darkMode!: boolean;
}

// ============================================================================
// REMOVED FIELDS (Unused in dev/test stage):
// 
// - dietaryRestrictions: string[] (complex dietary management)
// - preferredBrands: string[] (brand preference tracking)
// - deliveryPreference: string (delivery option preferences)
// - language: string (internationalization)
// - currency: string (multi-currency support)
// - timezone: string (timezone handling)
// - marketingOptIn: boolean (marketing features)
// - dataAnalyticsOptIn: boolean (analytics consent)
// - budgetLimit: number (budget management)
// - favoriteCategories: string[] (category preferences)
// - allergies: string[] (allergy management)
// - householdSize: number (household demographics)
// - shoppingFrequency: string (shopping pattern analysis)
// 
// These features would be valuable in production but add unnecessary
// complexity for the current dev/test stage focused on core ML functionality.
// ============================================================================