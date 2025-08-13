import sequelize from '../config/database.js';

export const createTables = async () => {
  try {
    console.log('Creating database tables...');
    
    // Create users table first
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'contractor',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log('Users table created successfully');
    
    // Create companies table after users table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(255),
        email VARCHAR(255),
        website VARCHAR(255),
        license VARCHAR(255),
        insurance VARCHAR(255),
        logo TEXT,
        "primaryColor" VARCHAR(255) DEFAULT '#2563eb',
        "secondaryColor" VARCHAR(255) DEFAULT '#1e40af',
        "termsConditions" JSON,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log('Companies table created successfully');
    console.log('All database tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};
