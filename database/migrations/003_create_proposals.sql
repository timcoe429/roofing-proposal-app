-- Migration 003: Create Proposals table
-- Depends on: 001_create_users.sql, 002_create_companies.sql

CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    proposal_number VARCHAR(50) UNIQUE,
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Client Information
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    client_address TEXT,
    
    -- Property Information
    property_address TEXT,
    property_type VARCHAR(100),
    
    -- Measurements (JSONB for flexibility)
    measurements JSONB DEFAULT '{}',
    
    -- Materials (JSONB array)
    materials JSONB DEFAULT '[]',
    
    -- Labor
    labor_hours DECIMAL(10, 2) DEFAULT 0,
    labor_rate DECIMAL(10, 2) DEFAULT 75,
    
    -- Pricing
    materials_cost DECIMAL(10, 2) DEFAULT 0,
    labor_cost DECIMAL(10, 2) DEFAULT 0,
    overhead_percent DECIMAL(5, 2) DEFAULT 15,
    profit_percent DECIMAL(5, 2) DEFAULT 20,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- Add-ons (JSONB array)
    addons JSONB DEFAULT '[]',
    
    -- Damage Areas (JSONB array)
    damage_areas JSONB DEFAULT '[]',
    
    -- Project Details
    timeline VARCHAR(255),
    warranty VARCHAR(255),
    notes TEXT,
    terms_conditions TEXT,
    
    -- Files (JSONB array)
    uploaded_files JSONB DEFAULT '[]',
    generated_pdf_url VARCHAR(500),
    
    -- Important Dates
    valid_until DATE,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    responded_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for proposals
CREATE INDEX idx_proposals_company ON proposals(company_id);
CREATE INDEX idx_proposals_user ON proposals(user_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_number ON proposals(proposal_number);
CREATE INDEX idx_proposals_created ON proposals(created_at DESC);

-- Add update trigger
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
