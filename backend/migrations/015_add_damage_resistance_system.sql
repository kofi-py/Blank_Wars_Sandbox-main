-- Migration: Add damage type resistance system (Phase 1)
-- Purpose: Implement percentage-based resistance system for physical, magical, and elemental damage
-- Research: Based on best practices for RPG damage systems (percentage-based scaling)

-- Step 1: Add resistance columns to characters table
-- Using percentage values (0-100) where 0 = no resistance, 50 = half damage, 100 = immune
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS physical_resistance INTEGER DEFAULT 0
    CHECK (physical_resistance >= 0 AND physical_resistance <= 100);

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS magical_resistance INTEGER DEFAULT 0
    CHECK (magical_resistance >= 0 AND magical_resistance <= 100);

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS elemental_resistance INTEGER DEFAULT 0
    CHECK (elemental_resistance >= 0 AND elemental_resistance <= 100);

-- Step 2: Create damage type reference table for documentation/validation
CREATE TABLE IF NOT EXISTS damage_type_reference (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('physical', 'magical', 'elemental')),
  description TEXT,
  resistance_stat TEXT NOT NULL,
  icon TEXT
);

-- Step 3: Seed damage types (simple 3-category system per research)
INSERT INTO damage_type_reference (id, name, category, description, resistance_stat, icon) VALUES
  -- Physical category
  ('physical', 'Physical', 'physical', 'Standard physical attacks', 'physical_resistance', '⚔️'),
  ('piercing', 'Piercing', 'physical', 'Piercing physical damage', 'physical_resistance', '🗡️'),
  ('slashing', 'Slashing', 'physical', 'Slashing physical damage', 'physical_resistance', '⚔️'),
  ('bludgeoning', 'Bludgeoning', 'physical', 'Bludgeoning physical damage', 'physical_resistance', '🔨'),

  -- Magical category (uses existing magic_defense stat for base magic, magical_resistance for specialized)
  ('magic', 'Magic', 'magical', 'Arcane/magical attacks', 'magic_defense', '✨'),
  ('arcane', 'Arcane', 'magical', 'Pure arcane damage', 'magic_defense', '🔮'),
  ('holy', 'Holy', 'magical', 'Divine/light damage, bonus vs undead/demons', 'magical_resistance', '☀️'),
  ('dark', 'Dark', 'magical', 'Shadow/necromantic damage', 'magical_resistance', '🌑'),
  ('psychic', 'Psychic', 'magical', 'Mental damage, ignores physical armor', 'magical_resistance', '💭'),

  -- Elemental category
  ('fire', 'Fire', 'elemental', 'Flame damage', 'elemental_resistance', '🔥'),
  ('lightning', 'Lightning', 'elemental', 'Electric damage', 'elemental_resistance', '⚡'),
  ('ice', 'Ice', 'elemental', 'Cold damage', 'elemental_resistance', '❄️'),
  ('poison', 'Poison', 'elemental', 'Toxic damage', 'elemental_resistance', '💉'),
  ('acid', 'Acid', 'elemental', 'Corrosive damage', 'elemental_resistance', '🧪')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create index for damage type lookups
CREATE INDEX IF NOT EXISTS idx_damage_type_category ON damage_type_reference(category);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN characters.physical_resistance IS 'Percentage resistance to physical damage (0-100)';
COMMENT ON COLUMN characters.magical_resistance IS 'Percentage resistance to magical damage types (0-100)';
COMMENT ON COLUMN characters.elemental_resistance IS 'Percentage resistance to elemental damage (0-100)';
COMMENT ON TABLE damage_type_reference IS 'Reference table mapping damage types to resistance stats';
