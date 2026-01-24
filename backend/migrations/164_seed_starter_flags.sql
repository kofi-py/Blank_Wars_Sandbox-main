
-- Set 'Minor Heal' as a Starter Spell
UPDATE spell_definitions 
SET is_starter = TRUE 
WHERE name = 'Minor Heal';

-- Set 'Focus' as a Starter Power
UPDATE power_definitions
SET is_starter = TRUE
WHERE name = 'Focus';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (164, '164_seed_starter_flags')
ON CONFLICT (version) DO NOTHING;
