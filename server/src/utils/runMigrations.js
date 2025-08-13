import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sequelize from '../config/database.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create migrations tracking table
const createMigrationsTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Get list of executed migrations
const getExecutedMigrations = async () => {
  const [results] = await sequelize.query(
    'SELECT filename FROM migrations ORDER BY filename'
  );
  return results.map(r => r.filename);
};

// Record migration as executed
const recordMigration = async (filename) => {
  await sequelize.query(
    'INSERT INTO migrations (filename) VALUES (:filename)',
    { replacements: { filename } }
  );
};

// Run all pending migrations
export const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');
    
    // Ensure migrations table exists
    await createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../../database/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    // Run pending migrations
    for (const file of sqlFiles) {
      if (!executedMigrations.includes(file)) {
        logger.info(`Running migration: ${file}`);
        
        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf8');
        
        // Execute migration in a transaction
        const transaction = await sequelize.transaction();
        try {
          await sequelize.query(sql, { transaction });
          await recordMigration(file);
          await transaction.commit();
          logger.info(`✓ Migration ${file} completed`);
        } catch (error) {
          await transaction.rollback();
          logger.error(`✗ Migration ${file} failed:`, error);
          throw error;
        }
      }
    }
    
    logger.info('All migrations completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
};

// Rollback last migration (optional)
export const rollbackMigration = async () => {
  try {
    const [lastMigration] = await sequelize.query(
      'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (!lastMigration || !lastMigration[0]) {
      logger.info('No migrations to rollback');
      return;
    }
    
    const filename = lastMigration[0].filename;
    logger.info(`Rolling back migration: ${filename}`);
    
    // Note: You'd need to create corresponding rollback files
    // For now, this just removes the record
    await sequelize.query(
      'DELETE FROM migrations WHERE filename = :filename',
      { replacements: { filename } }
    );
    
    logger.info(`Rollback completed for ${filename}`);
  } catch (error) {
    logger.error('Rollback failed:', error);
    throw error;
  }
};

// CLI support
if (process.argv[2] === 'up') {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv[2] === 'down') {
  rollbackMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
