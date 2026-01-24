-- Migration 285: Populate preferences for 242 characters with missing archetypes
-- Archetypes: beast (57), beastmaster (5), detective (23), leader (69), magical_appliance (15), system (73)

BEGIN;

-- Create a temporary function to insert preferences for a character
CREATE OR REPLACE FUNCTION temp_insert_archetype_preferences(
    p_character_id UUID,
    p_archetype TEXT
) RETURNS VOID AS $$
DECLARE
    pref RECORD;
BEGIN
    -- This function mirrors the logic in preferencePopulationService.ts
    -- Insert preferences based on archetype

    IF p_archetype = 'beast' THEN
        -- Equipment
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'equipment_type', 'natural_weapon', 4),
            (p_character_id, 'equipment_type', 'claws', 4),
            (p_character_id, 'equipment_type', 'natural_armor', 4),
            (p_character_id, 'equipment_type', 'light_armor', 3),
            (p_character_id, 'equipment_type', 'staff', 1),
            (p_character_id, 'equipment_type', 'robes', 1),
            (p_character_id, 'equipment_type', 'wand', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Damage types
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'damage_type', 'physical', 4),
            (p_character_id, 'damage_type', 'piercing', 4),
            (p_character_id, 'damage_type', 'nature', 4),
            (p_character_id, 'damage_type', 'slashing', 4),
            (p_character_id, 'damage_type', 'magic', 1),
            (p_character_id, 'damage_type', 'arcane', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Spell tiers
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'spell_tier', 'species', 4),
            (p_character_id, 'spell_tier', 'signature', 4),
            (p_character_id, 'spell_tier', 'archetype', 3),
            (p_character_id, 'spell_tier', 'universal', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Power categories
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'power_category', 'offensive', 4),
            (p_character_id, 'power_category', 'combat', 4),
            (p_character_id, 'power_category', 'passive', 4),
            (p_character_id, 'power_category', 'defensive', 3),
            (p_character_id, 'power_category', 'utility', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Attributes (all 19)
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'attribute', 'strength', 4),
            (p_character_id, 'attribute', 'dexterity', 4),
            (p_character_id, 'attribute', 'endurance', 4),
            (p_character_id, 'attribute', 'attack', 4),
            (p_character_id, 'attribute', 'defense', 3),
            (p_character_id, 'attribute', 'speed', 4),
            (p_character_id, 'attribute', 'magic_attack', 1),
            (p_character_id, 'attribute', 'magic_defense', 2),
            (p_character_id, 'attribute', 'intelligence', 1),
            (p_character_id, 'attribute', 'wisdom', 2),
            (p_character_id, 'attribute', 'spirit', 3),
            (p_character_id, 'attribute', 'charisma', 1),
            (p_character_id, 'attribute', 'communication', 1),
            (p_character_id, 'attribute', 'energy_regen', 4),
            (p_character_id, 'attribute', 'fire_resistance', 2),
            (p_character_id, 'attribute', 'cold_resistance', 2),
            (p_character_id, 'attribute', 'lightning_resistance', 2),
            (p_character_id, 'attribute', 'toxic_resistance', 3),
            (p_character_id, 'attribute', 'elemental_resistance', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Resources
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'resource', 'health', 4),
            (p_character_id, 'resource', 'energy', 4),
            (p_character_id, 'resource', 'mana', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

    ELSIF p_archetype = 'beastmaster' THEN
        -- Equipment
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'equipment_type', 'staff', 4),
            (p_character_id, 'equipment_type', 'whip', 4),
            (p_character_id, 'equipment_type', 'light_armor', 4),
            (p_character_id, 'equipment_type', 'cloak', 3),
            (p_character_id, 'equipment_type', 'heavy_armor', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Damage types
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'damage_type', 'nature', 4),
            (p_character_id, 'damage_type', 'physical', 3),
            (p_character_id, 'damage_type', 'poison', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Spell tiers
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'spell_tier', 'archetype', 4),
            (p_character_id, 'spell_tier', 'species', 4),
            (p_character_id, 'spell_tier', 'universal', 3),
            (p_character_id, 'spell_tier', 'signature', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Power categories
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'power_category', 'support', 4),
            (p_character_id, 'power_category', 'utility', 4),
            (p_character_id, 'power_category', 'passive', 4),
            (p_character_id, 'power_category', 'heal', 3),
            (p_character_id, 'power_category', 'offensive', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Attributes (all 19)
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'attribute', 'strength', 2),
            (p_character_id, 'attribute', 'dexterity', 3),
            (p_character_id, 'attribute', 'endurance', 3),
            (p_character_id, 'attribute', 'attack', 2),
            (p_character_id, 'attribute', 'defense', 2),
            (p_character_id, 'attribute', 'speed', 3),
            (p_character_id, 'attribute', 'magic_attack', 3),
            (p_character_id, 'attribute', 'magic_defense', 3),
            (p_character_id, 'attribute', 'intelligence', 3),
            (p_character_id, 'attribute', 'wisdom', 4),
            (p_character_id, 'attribute', 'spirit', 4),
            (p_character_id, 'attribute', 'charisma', 4),
            (p_character_id, 'attribute', 'communication', 4),
            (p_character_id, 'attribute', 'energy_regen', 3),
            (p_character_id, 'attribute', 'fire_resistance', 2),
            (p_character_id, 'attribute', 'cold_resistance', 2),
            (p_character_id, 'attribute', 'lightning_resistance', 2),
            (p_character_id, 'attribute', 'toxic_resistance', 3),
            (p_character_id, 'attribute', 'elemental_resistance', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Resources
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'resource', 'energy', 4),
            (p_character_id, 'resource', 'mana', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

    ELSIF p_archetype = 'detective' THEN
        -- Equipment
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'equipment_type', 'revolver', 4),
            (p_character_id, 'equipment_type', 'pistol', 4),
            (p_character_id, 'equipment_type', 'knife', 4),
            (p_character_id, 'equipment_type', 'cane', 3),
            (p_character_id, 'equipment_type', 'light_armor', 4),
            (p_character_id, 'equipment_type', 'fedora', 3),
            (p_character_id, 'equipment_type', 'heavy_armor', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Damage types
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'damage_type', 'physical', 4),
            (p_character_id, 'damage_type', 'piercing', 4),
            (p_character_id, 'damage_type', 'ranged', 4),
            (p_character_id, 'damage_type', 'psychic', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Spell tiers
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'spell_tier', 'signature', 4),
            (p_character_id, 'spell_tier', 'archetype', 3),
            (p_character_id, 'spell_tier', 'species', 3),
            (p_character_id, 'spell_tier', 'universal', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Power categories
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'power_category', 'passive', 4),
            (p_character_id, 'power_category', 'utility', 4),
            (p_character_id, 'power_category', 'debuff', 4),
            (p_character_id, 'power_category', 'offensive', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Attributes (all 19)
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'attribute', 'strength', 2),
            (p_character_id, 'attribute', 'dexterity', 4),
            (p_character_id, 'attribute', 'endurance', 3),
            (p_character_id, 'attribute', 'attack', 3),
            (p_character_id, 'attribute', 'defense', 2),
            (p_character_id, 'attribute', 'speed', 3),
            (p_character_id, 'attribute', 'magic_attack', 2),
            (p_character_id, 'attribute', 'magic_defense', 2),
            (p_character_id, 'attribute', 'intelligence', 4),
            (p_character_id, 'attribute', 'wisdom', 4),
            (p_character_id, 'attribute', 'spirit', 3),
            (p_character_id, 'attribute', 'charisma', 3),
            (p_character_id, 'attribute', 'communication', 4),
            (p_character_id, 'attribute', 'energy_regen', 3),
            (p_character_id, 'attribute', 'fire_resistance', 2),
            (p_character_id, 'attribute', 'cold_resistance', 2),
            (p_character_id, 'attribute', 'lightning_resistance', 2),
            (p_character_id, 'attribute', 'toxic_resistance', 2),
            (p_character_id, 'attribute', 'elemental_resistance', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Resources
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'resource', 'energy', 4),
            (p_character_id, 'resource', 'mana', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

    ELSIF p_archetype = 'leader' THEN
        -- Equipment
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'equipment_type', 'sword', 4),
            (p_character_id, 'equipment_type', 'crown', 4),
            (p_character_id, 'equipment_type', 'banner', 4),
            (p_character_id, 'equipment_type', 'shield', 4),
            (p_character_id, 'equipment_type', 'heavy_armor', 4),
            (p_character_id, 'equipment_type', 'spear', 3),
            (p_character_id, 'equipment_type', 'robes', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Damage types
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'damage_type', 'physical', 4),
            (p_character_id, 'damage_type', 'holy', 4),
            (p_character_id, 'damage_type', 'slashing', 3),
            (p_character_id, 'damage_type', 'psychic', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Spell tiers
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'spell_tier', 'archetype', 4),
            (p_character_id, 'spell_tier', 'universal', 4),
            (p_character_id, 'spell_tier', 'signature', 3),
            (p_character_id, 'spell_tier', 'species', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Power categories
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'power_category', 'support', 4),
            (p_character_id, 'power_category', 'defensive', 4),
            (p_character_id, 'power_category', 'passive', 4),
            (p_character_id, 'power_category', 'combat', 3),
            (p_character_id, 'power_category', 'ultimate', 3),
            (p_character_id, 'power_category', 'utility', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Attributes (all 19)
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'attribute', 'strength', 3),
            (p_character_id, 'attribute', 'dexterity', 2),
            (p_character_id, 'attribute', 'endurance', 4),
            (p_character_id, 'attribute', 'attack', 3),
            (p_character_id, 'attribute', 'defense', 4),
            (p_character_id, 'attribute', 'speed', 3),
            (p_character_id, 'attribute', 'magic_attack', 2),
            (p_character_id, 'attribute', 'magic_defense', 3),
            (p_character_id, 'attribute', 'intelligence', 3),
            (p_character_id, 'attribute', 'wisdom', 4),
            (p_character_id, 'attribute', 'spirit', 4),
            (p_character_id, 'attribute', 'charisma', 4),
            (p_character_id, 'attribute', 'communication', 4),
            (p_character_id, 'attribute', 'energy_regen', 3),
            (p_character_id, 'attribute', 'fire_resistance', 3),
            (p_character_id, 'attribute', 'cold_resistance', 3),
            (p_character_id, 'attribute', 'lightning_resistance', 3),
            (p_character_id, 'attribute', 'toxic_resistance', 3),
            (p_character_id, 'attribute', 'elemental_resistance', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Resources
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'resource', 'health', 4),
            (p_character_id, 'resource', 'energy', 4),
            (p_character_id, 'resource', 'mana', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

    ELSIF p_archetype = 'magical_appliance' THEN
        -- Equipment
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'equipment_type', 'energy_weapon', 4),
            (p_character_id, 'equipment_type', 'tech_armor', 4),
            (p_character_id, 'equipment_type', 'core', 4),
            (p_character_id, 'equipment_type', 'generator', 4),
            (p_character_id, 'equipment_type', 'coil', 4),
            (p_character_id, 'equipment_type', 'plating', 3),
            (p_character_id, 'equipment_type', 'sword', 1),
            (p_character_id, 'equipment_type', 'bow', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Damage types
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'damage_type', 'fire', 4),
            (p_character_id, 'damage_type', 'lightning', 4),
            (p_character_id, 'damage_type', 'energy', 4),
            (p_character_id, 'damage_type', 'elemental', 4),
            (p_character_id, 'damage_type', 'physical', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Spell tiers
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'spell_tier', 'signature', 4),
            (p_character_id, 'spell_tier', 'species', 4),
            (p_character_id, 'spell_tier', 'archetype', 3),
            (p_character_id, 'spell_tier', 'universal', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Power categories
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'power_category', 'offensive', 4),
            (p_character_id, 'power_category', 'utility', 4),
            (p_character_id, 'power_category', 'special', 4),
            (p_character_id, 'power_category', 'passive', 3),
            (p_character_id, 'power_category', 'debuff', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Attributes (all 19)
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'attribute', 'strength', 2),
            (p_character_id, 'attribute', 'dexterity', 2),
            (p_character_id, 'attribute', 'endurance', 4),
            (p_character_id, 'attribute', 'attack', 3),
            (p_character_id, 'attribute', 'defense', 4),
            (p_character_id, 'attribute', 'speed', 2),
            (p_character_id, 'attribute', 'magic_attack', 4),
            (p_character_id, 'attribute', 'magic_defense', 3),
            (p_character_id, 'attribute', 'intelligence', 4),
            (p_character_id, 'attribute', 'wisdom', 2),
            (p_character_id, 'attribute', 'spirit', 2),
            (p_character_id, 'attribute', 'charisma', 1),
            (p_character_id, 'attribute', 'communication', 2),
            (p_character_id, 'attribute', 'energy_regen', 4),
            (p_character_id, 'attribute', 'fire_resistance', 4),
            (p_character_id, 'attribute', 'cold_resistance', 2),
            (p_character_id, 'attribute', 'lightning_resistance', 4),
            (p_character_id, 'attribute', 'toxic_resistance', 4),
            (p_character_id, 'attribute', 'elemental_resistance', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Resources
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'resource', 'energy', 4),
            (p_character_id, 'resource', 'mana', 3),
            (p_character_id, 'resource', 'health', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

    ELSIF p_archetype = 'system' THEN
        -- Power categories
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'power_category', 'utility', 4),
            (p_character_id, 'power_category', 'support', 4),
            (p_character_id, 'power_category', 'heal', 3),
            (p_character_id, 'power_category', 'offensive', 1),
            (p_character_id, 'power_category', 'combat', 1)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Spell tiers
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'spell_tier', 'universal', 4),
            (p_character_id, 'spell_tier', 'archetype', 3),
            (p_character_id, 'spell_tier', 'species', 2),
            (p_character_id, 'spell_tier', 'signature', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Attributes (all 19 - social focused)
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'attribute', 'charisma', 4),
            (p_character_id, 'attribute', 'wisdom', 4),
            (p_character_id, 'attribute', 'intelligence', 4),
            (p_character_id, 'attribute', 'communication', 4),
            (p_character_id, 'attribute', 'spirit', 3),
            (p_character_id, 'attribute', 'strength', 1),
            (p_character_id, 'attribute', 'attack', 1),
            (p_character_id, 'attribute', 'defense', 2),
            (p_character_id, 'attribute', 'dexterity', 2),
            (p_character_id, 'attribute', 'endurance', 2),
            (p_character_id, 'attribute', 'speed', 2),
            (p_character_id, 'attribute', 'magic_attack', 2),
            (p_character_id, 'attribute', 'magic_defense', 2),
            (p_character_id, 'attribute', 'energy_regen', 3),
            (p_character_id, 'attribute', 'fire_resistance', 2),
            (p_character_id, 'attribute', 'cold_resistance', 2),
            (p_character_id, 'attribute', 'lightning_resistance', 2),
            (p_character_id, 'attribute', 'toxic_resistance', 2),
            (p_character_id, 'attribute', 'elemental_resistance', 2)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;

        -- Resources
        INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
        VALUES
            (p_character_id, 'resource', 'energy', 3),
            (p_character_id, 'resource', 'mana', 3),
            (p_character_id, 'resource', 'health', 3)
        ON CONFLICT (character_id, category_type, category_value) DO UPDATE SET rank = EXCLUDED.rank;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply preferences to all characters with missing archetypes
DO $$
DECLARE
    char_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    FOR char_record IN
        SELECT uc.id as user_char_id, c.archetype
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        LEFT JOIN character_category_preferences ccp ON uc.id = ccp.character_id
        WHERE c.archetype IN ('beast', 'beastmaster', 'detective', 'leader', 'magical_appliance', 'system')
          AND ccp.character_id IS NULL
        GROUP BY uc.id, c.archetype
    LOOP
        PERFORM temp_insert_archetype_preferences(char_record.user_char_id, char_record.archetype);
        processed_count := processed_count + 1;
    END LOOP;

    RAISE NOTICE 'Populated preferences for % characters', processed_count;
END $$;

-- Clean up temporary function
DROP FUNCTION IF EXISTS temp_insert_archetype_preferences(UUID, TEXT);

COMMIT;

-- Log migration (after commit to ensure it only logs on success)
INSERT INTO migration_log (version, name, description)
VALUES (285, '285_populate_missing_archetype_preferences', 'Add preferences for 242 characters with archetypes: beast, beastmaster, detective, leader, magical_appliance, system')
ON CONFLICT (version) DO NOTHING;
