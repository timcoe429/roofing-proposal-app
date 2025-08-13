import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import '../models/index.js'; // Import models to register associations

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
          } : false
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
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
    
    // Force sync models to create tables (this will create tables if they don't exist)
    await sequelize.sync({ force: false, alter: true });
    console.log('INFO: Database models synchronized.');
    
    return sequelize;
  } catch (error) {
    console.error('ERROR: Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
