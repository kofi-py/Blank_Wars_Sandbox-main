-- Migration 295: Make contestant-only columns nullable for system characters
--
-- System characters (therapist, judge, trainer, etc.) don't need:
-- - wallet/debt (they don't have finances)
-- - combat stats (they don't fight)
--
-- Only contestants need these columns populated.

BEGIN;

-- =====================================================
-- 1. REMOVE NOT NULL FROM contestant-only columns
-- =====================================================

ALTER TABLE user_characters ALTER COLUMN wallet DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN debt DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_strength DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_endurance DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_accuracy DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_evasion DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_critical_chance DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_critical_damage DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_charisma DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_battle_focus DROP NOT NULL;

-- =====================================================
-- 2. ADD CHECK CONSTRAINTS - only contestants need these
-- =====================================================

ALTER TABLE user_characters
ADD CONSTRAINT chk_contestant_wallet
CHECK (role != 'contestant' OR wallet IS NOT NULL);

ALTER TABLE user_characters
ADD CONSTRAINT chk_contestant_debt
CHECK (role != 'contestant' OR debt IS NOT NULL);

ALTER TABLE user_characters
ADD CONSTRAINT chk_contestant_combat_stats
CHECK (role != 'contestant' OR (
  current_strength IS NOT NULL AND
  current_endurance IS NOT NULL AND
  current_accuracy IS NOT NULL AND
  current_evasion IS NOT NULL AND
  current_critical_chance IS NOT NULL AND
  current_critical_damage IS NOT NULL AND
  current_charisma IS NOT NULL AND
  current_battle_focus IS NOT NULL
));

-- =====================================================
-- 3. LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (295, '295_make_contestant_columns_nullable')
ON CONFLICT (version) DO NOTHING;

COMMIT;
