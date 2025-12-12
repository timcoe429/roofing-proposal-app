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
    
    // Create proposals table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER REFERENCES companies(id),
        "userId" INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'draft',
        "proposalNumber" VARCHAR(255) UNIQUE,
        "clientName" VARCHAR(255) NOT NULL,
        "clientEmail" VARCHAR(255),
        "clientPhone" VARCHAR(255),
        "clientAddress" TEXT,
        "propertyAddress" TEXT,
        "propertyCity" VARCHAR(255),
        "propertyState" VARCHAR(50),
        "propertyZip" VARCHAR(20),
        "projectType" VARCHAR(255),
        "materialType" VARCHAR(255),
        "roofSize" VARCHAR(255),
        "specialRequirements" TEXT,
        urgency VARCHAR(50),
        measurements JSONB DEFAULT '{}',
        materials JSONB DEFAULT '[]',
        "laborHours" DECIMAL(10,2) DEFAULT 0,
        "laborRate" DECIMAL(10,2) DEFAULT 75,
        "materialsCost" DECIMAL(10,2) DEFAULT 0,
        "laborCost" DECIMAL(10,2) DEFAULT 0,
        "overheadPercent" DECIMAL(5,2) DEFAULT 15,
        "profitPercent" DECIMAL(5,2) DEFAULT 20,
        "totalAmount" DECIMAL(10,2) DEFAULT 0,
        "addOns" JSONB DEFAULT '[]',
        "damageAreas" JSONB DEFAULT '[]',
        timeline VARCHAR(255),
        warranty VARCHAR(255),
        notes TEXT,
        "uploadedFiles" JSONB DEFAULT '[]',
        "generatedPdfUrl" VARCHAR(255),
        "validUntil" TIMESTAMP,
        "sentAt" TIMESTAMP,
        "viewedAt" TIMESTAMP,
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Add new columns to existing databases safely (Railway production)
    await sequelize.query(`
      ALTER TABLE proposals
      ADD COLUMN IF NOT EXISTS "aiChatHistory" JSONB DEFAULT '[]'::jsonb;
    `);
    
    console.log('Proposals table created successfully');
    
    // Create materials table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER REFERENCES companies(id),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        manufacturer VARCHAR(255),
        sku VARCHAR(100),
        unit VARCHAR(50) DEFAULT 'each',
        cost DECIMAL(10,2),
        price DECIMAL(10,2),
        description TEXT,
        specifications JSONB DEFAULT '{}',
        "imageUrl" VARCHAR(500),
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log('Materials table created successfully');
    console.log('All database tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};
