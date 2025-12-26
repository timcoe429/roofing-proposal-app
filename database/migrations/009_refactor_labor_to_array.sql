-- Migration 009: Refactor labor from fields to array
-- Moves labor from laborHours/laborRate fields to labor JSONB array
-- This creates a single source of truth for labor data

-- Step 1: Add labor JSONB column
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS "labor" JSONB DEFAULT '[]';

-- Step 2: Migrate existing data from laborHours/laborRate to labor array
-- Only migrate if laborHours > 0 or laborRate > 0, and labor array is empty
UPDATE proposals
SET "labor" = CASE
  WHEN ("laborHours" > 0 OR "laborRate" > 0) AND ("labor" IS NULL OR jsonb_array_length("labor") = 0) THEN
    jsonb_build_array(
      jsonb_build_object(
        'id', floor(extract(epoch from now()) * 1000),
        'name', 'Roofing Labor',
        'hours', COALESCE("laborHours", 0),
        'rate', COALESCE("laborRate", 75),
        'total', COALESCE("laborHours", 0) * COALESCE("laborRate", 75)
      )
    )
  ELSE COALESCE("labor", '[]'::jsonb)
END
WHERE "laborHours" IS NOT NULL OR "laborRate" IS NOT NULL;

-- Step 3: Remove old labor columns (after data migration)
-- Note: We'll keep the columns for now in case of rollback, but mark them as deprecated
-- Actually removing columns can be done in a later migration after verification

-- Add comment explaining the new structure
COMMENT ON COLUMN proposals."labor" IS 'JSONB array of labor items: [{ name: string, hours: number, rate: number, total: number }]';

