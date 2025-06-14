// backend/src/database/migrate.ts
import { sequelize } from '../config/database.config';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Create migrations table if it doesn't exist
async function createMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Check if migration has been executed
async function isMigrationExecuted(migrationId: string): Promise<boolean> {
  const [results] = await sequelize.query(
    'SELECT id FROM migrations WHERE id = ?',
    { replacements: [migrationId] }
  );
  return results.length > 0;
}

// Mark migration as executed
async function markMigrationExecuted(migrationId: string, name: string) {
  await sequelize.query(
    'INSERT INTO migrations (id, name) VALUES (?, ?)',
    { replacements: [migrationId, name] }
  );
}

// Import all migration files
function loadMigrations(): Migration[] {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
    .sort();

  const migrations: Migration[] = [];

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migration = require(migrationPath);
    
    if (migration.default && typeof migration.default.up === 'function') {
      migrations.push(migration.default);
    } else if (typeof migration.up === 'function') {
      migrations.push(migration);
    }
  }

  return migrations;
}

// Run all pending migrations
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Ensure database connection
    await sequelize.authenticate();
    logger.info('Database connection established for migrations.');

    // Create migrations table
    await createMigrationsTable();

    // Load all migrations
    const migrations = loadMigrations();
    
    if (migrations.length === 0) {
      logger.info('No migrations found.');
      return;
    }

    let executedCount = 0;

    // Run each migration
    for (const migration of migrations) {
      const isExecuted = await isMigrationExecuted(migration.id);
      
      if (isExecuted) {
        logger.info(`Migration ${migration.id} already executed, skipping.`);
        continue;
      }

      logger.info(`Running migration: ${migration.name} (${migration.id})`);
      
      // Start transaction
      const transaction = await sequelize.transaction();
      
      try {
        // Run the migration
        await migration.up();
        
        // Mark as executed
        await markMigrationExecuted(migration.id, migration.name);
        
        // Commit transaction
        await transaction.commit();
        
        logger.info(`Migration ${migration.id} completed successfully.`);
        executedCount++;
        
      } catch (error) {
        // Rollback transaction
        await transaction.rollback();
        logger.error(`Migration ${migration.id} failed:`, error);
        throw error;
      }
    }

    if (executedCount === 0) {
      logger.info('All migrations were already executed.');
    } else {
      logger.info(`Successfully executed ${executedCount} migrations.`);
    }

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations, loadMigrations };