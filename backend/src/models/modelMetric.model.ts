// backend/src/models/modelMetric.model.ts
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'model_metrics',
  timestamps: false // Assuming timestamp is handled by `DEFAULT CURRENT_TIMESTAMP`
})
export class ModelMetric extends Model {
  @Column({
    type: DataType.INTEGER, // Changed from UUID to INTEGER to match SERIAL
    primaryKey: true,
    autoIncrement: true
  })
  id!: number;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  timestamp!: Date;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  precision_at_10?: number; // Column names from init.sql

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  recall_at_10?: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  f1_at_10?: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  ndcg_at_10?: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  hit_rate_at_10?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  model_version?: string;

  @Column({
    type: DataType.JSONB, // Use JSONB for PostgreSQL
    allowNull: true
  })
  metrics_json?: Record<string, any>;
}