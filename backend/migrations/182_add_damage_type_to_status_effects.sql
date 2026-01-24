-- Migration 182: Add damage_type column to status_effect_types
-- Links DoT effects to their damage type from damage_type_reference

BEGIN;

-- Add damage_type column with foreign key to damage_type_reference
ALTER TABLE status_effect_types
ADD COLUMN damage_type TEXT REFERENCES damage_type_reference(id);

-- Populate damage_type for DoT effects
UPDATE status_effect_types SET damage_type = 'fire' WHERE id = 'burn';
UPDATE status_effect_types SET damage_type = 'poison' WHERE id = 'poison';
UPDATE status_effect_types SET damage_type = 'physical' WHERE id = 'bleed';

-- Record migration
INSERT INTO migration_log (version, name)
VALUES (182, '182_add_damage_type_to_status_effects')
ON CONFLICT (version) DO NOTHING;

COMMIT;
