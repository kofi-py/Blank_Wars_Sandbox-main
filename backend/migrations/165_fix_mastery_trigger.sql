
-- Fix bug in update_mastery_level function (spell_id -> id)
CREATE OR REPLACE FUNCTION update_mastery_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
    item_strength INTEGER := 1; -- Default to 1
    config_type VARCHAR;
BEGIN
    -- Determine type and fetch strength level
    IF TG_TABLE_NAME = 'character_spells' THEN
        config_type := 'spell';
        -- Try to get strength level from definition
        SELECT strength_level INTO item_strength 
        FROM spell_definitions WHERE id = NEW.spell_id;
    ELSIF TG_TABLE_NAME = 'character_powers' THEN
        config_type := 'power';
        -- Try to get strength level from definition
        SELECT strength_level INTO item_strength 
        FROM power_definitions WHERE id = NEW.power_id;
    END IF;

    -- Default strength to 1 if not found
    IF item_strength IS NULL THEN
        item_strength := 1;
    END IF;

    -- Find the highest level reachable with current points
    SELECT MAX(mastery_level) INTO new_level
    FROM mastery_config
    WHERE type = config_type
    AND strength_level = item_strength
    AND points_required <= NEW.mastery_points;

    -- Update the level if it changed and is valid
    IF new_level IS NOT NULL AND new_level != OLD.mastery_level THEN
        NEW.mastery_level := new_level;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (165, '165_fix_mastery_trigger')
ON CONFLICT (version) DO NOTHING;
