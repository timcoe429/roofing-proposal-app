import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { createTables } from '../utils/createTables.js';

dotenv.config();

// Parse DATABASE_URL for Railway PostgreSQL
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    // Railway provides DATABASE_URL
    return {
      url: process.env.DATABASE_URL,
      options: {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
          ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
          } : false,
          // Railway-specific connection options
          connectTimeout: 60000,
          socketTimeout: 60000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 0
        },
        pool: {
          max: 10, // Increased for Railway
          min: 2,  // Keep minimum connections
          acquire: 60000, // Increased timeout
          idle: 30000,    // Increased idle time
          evict: 1000,    // Railway-specific: evict connections
          handleDisconnects: true
        },
        retry: {
          match: [
            /ETIMEDOUT/,
            /EHOSTUNREACH/,
            /ECONNRESET/,
            /ECONNREFUSED/,
            /ENOTFOUND/,
            /EAI_AGAIN/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/
          ],
          max: 3
        }
      }
    };
  }
  
  // Local development configuration
  return {
    database: process.env.DB_NAME || 'roofing_proposals',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    options: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  };
};

const config = getDatabaseConfig();

// Initialize Sequelize
const sequelize = config.url 
  ? new Sequelize(config.url, config.options)
  : new Sequelize(config.database, config.username, config.password, config.options);

// Test database connection
export const setupDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('INFO: Database connection established successfully.');
    
    // Create tables using raw SQL (more reliable than Sequelize sync)
    await createTables();
    console.log('INFO: Database tables created successfully.');
    
    return sequelize;
  } catch (error) {
    console.error('ERROR: Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
