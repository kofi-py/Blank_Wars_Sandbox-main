-- Migration 166: Raise base stats for max_health, max_energy, max_mana from 50 to 100
-- This prevents negative values when stacked negative modifiers are applied
-- (e.g., Merlin with mage + human_magical + individual all having energy penalties)
-- Relative balance is preserved since all characters get the same +50 increase

-- Update all characters: add 50 to max_health, max_energy, max_mana
UPDATE characters
SET
  max_health = max_health + 50,
  max_energy = max_energy + 50,
  max_mana = max_mana + 50;

COMMENT ON TABLE characters IS 'Stats use base 100 for max_health/max_energy/max_mana (raised from 50 in migration 166) to prevent negative values from stacked modifiers. Combat stats remain base 50.';
