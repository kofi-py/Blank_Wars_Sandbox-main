-- Populate loadout tables with starter powers/spells
-- Each character has 1 starter power and 1 starter spell that should be auto-equipped

-- Add starter powers to loadout (slot 1)
INSERT INTO character_power_loadout (user_character_id, power_id, slot_number)
SELECT cp.character_id, cp.power_id, 1
FROM character_powers cp
WHERE NOT EXISTS (
  SELECT 1 FROM character_power_loadout cpl
  WHERE cpl.user_character_id = cp.character_id
)
ON CONFLICT (user_character_id, slot_number) DO NOTHING;

-- Add starter spells to loadout (slot 1)
INSERT INTO character_spell_loadout (user_character_id, spell_id, slot_number)
SELECT cs.character_id, cs.spell_id, 1
FROM character_spells cs
WHERE NOT EXISTS (
  SELECT 1 FROM character_spell_loadout csl
  WHERE csl.user_character_id = cs.character_id
)
ON CONFLICT (user_character_id, slot_number) DO NOTHING;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (271, '271_populate_starter_loadouts')
ON CONFLICT (version) DO NOTHING;
