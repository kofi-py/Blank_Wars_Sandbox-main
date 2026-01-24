-- Migration 283: Populate spell_definitions.category from effects JSON
-- This derives categories for the 308 spells that currently have NULL category

BEGIN;

-- Update spells based on effects content
-- Priority order: heal > offensive > defensive > debuff > buff > summon > utility

-- 1. Heal spells (has "heal" type or "heal" key in effects)
UPDATE spell_definitions
SET category = 'heal'
WHERE category IS NULL
  AND (effects::text ILIKE '%"type":%"heal"%'
       OR effects::text ILIKE '%"heal":%'
       OR effects::text ILIKE '%heal_self%'
       OR effects::text ILIKE '%lifesteal%');

-- 2. Offensive spells (has "damage" type or damageType)
UPDATE spell_definitions
SET category = 'offensive'
WHERE category IS NULL
  AND (effects::text ILIKE '%"type":%"damage"%'
       OR effects::text ILIKE '%"damageType":%'
       OR effects::text ILIKE '%damage_undead%'
       OR effects::text ILIKE '%curse_damage%'
       OR effects::text ILIKE '%mental_damage%'
       OR effects::text ILIKE '%charge_damage%'
       OR effects::text ILIKE '%devour_damage%');

-- 3. Defensive spells (has armor, shield, or immunity)
UPDATE spell_definitions
SET category = 'defensive'
WHERE category IS NULL
  AND (effects::text ILIKE '%"armor":%'
       OR effects::text ILIKE '%"shield":%'
       OR effects::text ILIKE '%immunity_%'
       OR effects::text ILIKE '%"thorns":%');

-- 4. Debuff spells (has statusEffect debuff, curse, or stat reduction)
UPDATE spell_definitions
SET category = 'debuff'
WHERE category IS NULL
  AND (effects::text ILIKE '%debuff%'
       OR effects::text ILIKE '%curse%'
       OR effects::text ILIKE '%confusion%'
       OR effects::text ILIKE '%"stun"%'
       OR effects::text ILIKE '%blind%'
       OR effects::text ILIKE '%grievous_wound%');

-- 5. Buff spells (stat increases, buffs)
UPDATE spell_definitions
SET category = 'buff'
WHERE category IS NULL
  AND (effects::text ILIKE '%_buff%'
       OR effects::text ILIKE '%wisdom%'
       OR effects::text ILIKE '%strength%'
       OR effects::text ILIKE '%"speed":%');

-- 6. Summon spells
UPDATE spell_definitions
SET category = 'summon'
WHERE category IS NULL
  AND effects::text ILIKE '%summon%';

-- 7. Everything else is utility
UPDATE spell_definitions
SET category = 'utility'
WHERE category IS NULL;

-- Log category distribution after update
DO $$
DECLARE
    category_counts TEXT;
BEGIN
    SELECT string_agg(category || ': ' || cnt::text, ', ' ORDER BY category)
    INTO category_counts
    FROM (
        SELECT COALESCE(category, 'NULL') as category, COUNT(*) as cnt
        FROM spell_definitions
        GROUP BY category
    ) sub;

    RAISE NOTICE 'Spell category distribution: %', category_counts;
END $$;

COMMIT;

-- Log migration (after commit to ensure it only logs on success)
INSERT INTO migration_log (version, name, description)
VALUES (283, '283_populate_spell_categories', 'Derive spell categories from effects JSON for 308 NULL entries')
ON CONFLICT (version) DO NOTHING;
