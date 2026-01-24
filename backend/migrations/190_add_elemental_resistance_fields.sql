-- Migration 190: Add specific elemental resistance fields
-- Replaces generic elemental_resistance with specific types:
-- fire_resistance, cold_resistance, lightning_resistance, toxic_resistance (poison+acid)

BEGIN;

-- Add base fields to characters table (default 50 = neutral)
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS fire_resistance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cold_resistance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS lightning_resistance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS toxic_resistance INTEGER DEFAULT 50;

-- Add current fields to user_characters table
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_fire_resistance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_cold_resistance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_lightning_resistance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_toxic_resistance INTEGER DEFAULT 50;

-- Update damage_type_reference to use specific resistance stats
UPDATE damage_type_reference SET resistance_stat = 'fire_resistance' WHERE id = 'fire';
UPDATE damage_type_reference SET resistance_stat = 'cold_resistance' WHERE id = 'ice';
UPDATE damage_type_reference SET resistance_stat = 'lightning_resistance' WHERE id = 'lightning';
UPDATE damage_type_reference SET resistance_stat = 'toxic_resistance' WHERE id = 'poison';
UPDATE damage_type_reference SET resistance_stat = 'toxic_resistance' WHERE id = 'acid';

-- Also update physical damage types to use defense instead of physical_resistance
UPDATE damage_type_reference SET resistance_stat = 'defense' WHERE id IN ('physical', 'bludgeoning', 'slashing', 'piercing');

-- Update magical specialized damage types to use magic_defense instead of magical_resistance
UPDATE damage_type_reference SET resistance_stat = 'magic_defense' WHERE id IN ('holy', 'dark', 'psychic');

COMMIT;

-- Verification
SELECT id, name, category, resistance_stat FROM damage_type_reference ORDER BY category, id;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (190, '190_add_elemental_resistance_fields')
ON CONFLICT (version) DO NOTHING;
