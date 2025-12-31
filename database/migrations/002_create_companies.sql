-- Migration 002: Create Companies table
-- NOTE: Sequelize creates this table via createTables.js, so this migration is a no-op
-- Sequelize uses INTEGER (SERIAL) id and camelCase column names ("userId" not "owner_id")
SELECT 1; -- No-op to mark migration as executed
