-- Migration: Enforce wallet and debt are never NULL
-- These fields should always have a value (0 or greater)

-- First, ensure any NULL values are set to 0
UPDATE user_characters SET wallet = 0 WHERE wallet IS NULL;
UPDATE user_characters SET debt = 0 WHERE debt IS NULL;

-- Now add NOT NULL constraints
ALTER TABLE user_characters ALTER COLUMN wallet SET NOT NULL;
ALTER TABLE user_characters ALTER COLUMN debt SET NOT NULL;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (267, '267_enforce_wallet_debt_not_null')
ON CONFLICT (version) DO NOTHING;
