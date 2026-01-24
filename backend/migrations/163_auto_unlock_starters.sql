
-- Function to auto-unlock starter abilities
CREATE OR REPLACE FUNCTION auto_unlock_starters()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Unlock Starter Powers
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level)
    SELECT NEW.id, p.id, 0, 1
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level)
    SELECT NEW.id, s.spell_id, 0, 1
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        -- A. Signature Spell: Matches Character ID
        (s.character_id IS NOT NULL AND s.character_id = NEW.id)
        OR
        -- B. Archetype Spell: Matches Archetype
        (s.archetype IS NOT NULL AND s.archetype = NEW.archetype)
        OR
        -- C. Species Spell: Matches Species
        (s.species IS NOT NULL AND s.species = NEW.species)
        OR
        -- D. Universal Spell: No specific requirements
        (s.archetype IS NULL AND s.character_id IS NULL AND s.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on Character Creation
DROP TRIGGER IF EXISTS trigger_auto_unlock_starters ON user_characters;
CREATE TRIGGER trigger_auto_unlock_starters
AFTER INSERT ON user_characters
FOR EACH ROW
EXECUTE FUNCTION auto_unlock_starters();

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (163, '163_auto_unlock_starters')
ON CONFLICT (version) DO NOTHING;
