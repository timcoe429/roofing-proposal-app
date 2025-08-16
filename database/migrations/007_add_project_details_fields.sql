-- Migration 007: Add project details fields to proposals table
-- Adds fields required by the new Project Details tab

ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS property_city VARCHAR(255),
ADD COLUMN IF NOT EXISTS property_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS property_zip VARCHAR(20),
ADD COLUMN IF NOT EXISTS project_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS material_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS special_requirements TEXT,
ADD COLUMN IF NOT EXISTS urgency VARCHAR(50),
ADD COLUMN IF NOT EXISTS roof_size VARCHAR(50);
