-- Migration 004: Create Materials table
-- Depends on: 002_create_companies.sql

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    manufacturer VARCHAR(255),
    sku VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'each',
    cost DECIMAL(10, 2),
    price DECIMAL(10, 2),
    description TEXT,
    specifications JSONB DEFAULT '{}',
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for materials
CREATE INDEX idx_materials_company ON materials(company_id);
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_name ON materials(name);

-- Add update trigger
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();