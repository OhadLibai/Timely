// backend/src/database/migrations/001_add_metadata_to_user_preferences.ts
import { sequelize } from '../../config/database.config';

export default {
  id: '001_add_metadata_to_user_preferences',
  name: 'Add metadata column to user_preferences table',

  async up() {
    await sequelize.query(`
      ALTER TABLE user_preferences 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    `);
  },

  async down() {
    await sequelize.query(`
      ALTER TABLE user_preferences 
      DROP COLUMN IF EXISTS metadata;
    `);
  }
};