-- Migration 008: Add AI instructions field to companies table
-- Allows companies to configure custom AI instructions and location-specific knowledge

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS "aiInstructions" JSONB DEFAULT '{}';

-- Add comment explaining the structure
COMMENT ON COLUMN companies."aiInstructions" IS 'JSONB field storing AI instructions: { additionalInstructions: string, locationKnowledge: { [city]: string } }';

