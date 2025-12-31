-- Migration 002: Create Companies table
-- Depends on: 001_create_users.sql

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    license_number VARCHAR(100),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add owner_id column if it doesn't exist (for tables created without it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE companies ADD COLUMN owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for owner lookups (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);

-- Add update trigger (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
